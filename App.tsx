
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import SanctionsBrowser from './components/SanctionsBrowser';
import AdminPanel from './components/AdminPanel';
import { Client, SanctionEntry, SystemLog, RiskLevel, EntityType, AppSettings } from './types';
import { generateMockSanctions, QATAR_MOCK_SANCTIONS } from './services/mockData';
import { screenClient } from './services/screeningEngine';
import { OFFICIAL_UN_XML_URL } from './services/unSanctionsService';
import { initSupabase, fetchCloudClients, addCloudClient, deleteCloudClient, subscribeToClients, unsubscribeFromClients } from './services/cloudDb';

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: true,
  syncIntervalMinutes: 1440,
  sourceUrl: OFFICIAL_UN_XML_URL,
  lastSync: 'Never',
  nextSync: new Date(Date.now() + 86400000).toISOString()
};

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sanctions, setSanctions] = useState<SanctionEntry[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const addLog = useCallback((action: string, details: string, status: 'SUCCESS' | 'FAILURE' | 'WARNING') => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      details,
      status
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const runScreening = useCallback((client: Client, sanctionList: SanctionEntry[]): Client => {
    let highestRisk = RiskLevel.NONE;
    let mainMatchId: string | undefined;
    const allMatches: string[] = [];

    const entityMatch = screenClient(client, sanctionList);
    if (entityMatch) {
      highestRisk = entityMatch.riskLevel;
      mainMatchId = entityMatch.sanctionId;
      allMatches.push(`Entity: ${entityMatch.sanctionId}`);
    }

    const personSets: { label: string, people: any[] }[] = [
      { label: 'Director', people: client.directors },
      { label: 'Shareholder', people: client.shareholders },
      { label: 'UBO', people: client.ubos },
      { label: 'Signatory', people: client.signatories }
    ];

    for (const set of personSets) {
      for (const p of set.people) {
        if (!p.name) continue;
        const mockClient: any = {
          firstName: p.name,
          lastName: '',
          nationality: p.nationality,
          dob: p.dob || p.incDateOrDob,
          type: EntityType.INDIVIDUAL
        };
        const match = screenClient(mockClient, sanctionList);
        if (match) {
          allMatches.push(`${set.label} (${p.name}): ${match.sanctionId}`);
          if (
            (match.riskLevel === RiskLevel.HIGH) ||
            (match.riskLevel === RiskLevel.MEDIUM && highestRisk !== RiskLevel.HIGH) ||
            (match.riskLevel === RiskLevel.LOW && highestRisk === RiskLevel.NONE)
          ) {
            highestRisk = match.riskLevel;
            if (!mainMatchId) mainMatchId = match.sanctionId;
          }
        }
      }
    }

    return { ...client, lastScreenedAt: new Date().toISOString(), riskLevel: highestRisk, matchId: mainMatchId, matches: allMatches };
  }, []);

  const refreshClients = useCallback(async () => {
    if (isCloudConnected) {
      try {
        const cloudClients = await fetchCloudClients();
        if (cloudClients) {
          setClients(cloudClients);
          setCloudError(null);
        }
      } catch (err: any) {
        if (err.message?.includes("does not exist")) {
           setCloudError("Database Schema Mismatch: Run the SQL Script in Admin Panel.");
        } else {
           setCloudError(`Cloud Error: ${err.message}`);
        }
        addLog('CLOUD_ERROR', `Sync failed: ${err.message}`, 'FAILURE');
      }
    } else {
      const stored = localStorage.getItem('unsg_clients');
      if (stored) setClients(JSON.parse(stored));
    }
  }, [isCloudConnected, addLog]);

  useEffect(() => {
    const storedClients = localStorage.getItem('unsg_clients');
    const storedSanctions = localStorage.getItem('unsg_sanctions');
    const storedSettings = localStorage.getItem('unsg_settings');
    const currentSettings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
    
    setSettings(currentSettings);
    const connected = initSupabase(currentSettings);
    setIsCloudConnected(connected);
    
    if (storedClients) setClients(JSON.parse(storedClients));
    if (storedSanctions) setSanctions(JSON.parse(storedSanctions));
  }, []);

  // Sync effect for Cloud connection
  useEffect(() => {
    if (isCloudConnected) {
      refreshClients();
      const channel = subscribeToClients(() => {
        refreshClients();
      });
      return () => {
        if (channel) unsubscribeFromClients(channel);
      };
    }
  }, [isCloudConnected, refreshClients]);

  useEffect(() => { if (!isCloudConnected) localStorage.setItem('unsg_clients', JSON.stringify(clients)); }, [clients, isCloudConnected]);
  useEffect(() => { localStorage.setItem('unsg_sanctions', JSON.stringify(sanctions)); }, [sanctions]);
  useEffect(() => { localStorage.setItem('unsg_settings', JSON.stringify(settings)); }, [settings]);

  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => {
    let newClient: Client = { 
      ...newClientData, 
      id: Math.random().toString(36).substr(2, 9), 
      createdAt: new Date().toISOString(), 
      riskLevel: RiskLevel.NONE 
    };
    newClient = runScreening(newClient, sanctions);
    
    if (isCloudConnected) {
      try {
        await addCloudClient(newClient);
      } catch (e: any) {
        addLog('CLOUD_ERROR', e.message, 'FAILURE');
      }
    } else {
      setClients(prev => [newClient, ...prev]);
    }
  };

  const handleUpdateSanctions = async () => {
    setIsUpdating(true);
    addLog('SANCTION_UPDATE', 'Manual sync started.', 'SUCCESS');
    try {
      await new Promise(r => setTimeout(r, 1000));
      const combined = [...generateMockSanctions(20), ...QATAR_MOCK_SANCTIONS];
      setSanctions(combined);
      const updated = clients.map(c => runScreening(c, combined));
      setClients(updated);
      addLog('SANCTION_UPDATE', 'Sync complete.', 'SUCCESS');
    } catch (e) { addLog('SANCTION_UPDATE', 'Sync failed.', 'FAILURE'); }
    finally { setIsUpdating(false); }
  };

  return (
    <Router>
      <Layout cloudError={cloudError} isCloudConnected={isCloudConnected}>
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} sanctionsCount={sanctions.length} />} />
          <Route path="/clients" element={<ClientManager clients={clients} onAddClient={handleAddClient} onDeleteClient={async id => {
            if (isCloudConnected) await deleteCloudClient(id).catch(e => addLog('CLOUD_ERROR', e.message, 'FAILURE'));
            else setClients(prev => prev.filter(c => c.id !== id));
          }} onRefresh={refreshClients} />} />
          <Route path="/sanctions" element={<SanctionsBrowser sanctions={sanctions} lastUpdated={settings.lastSync} onRefresh={handleUpdateSanctions} isUpdating={isUpdating} onFileUpload={() => {}} />} />
          <Route path="/admin" element={<AdminPanel logs={logs} settings={settings} onUpdateSettings={setSettings} onTriggerSync={handleUpdateSanctions} isSyncing={isUpdating} onExportData={() => {}} onImportData={() => {}} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
