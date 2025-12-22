import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import SanctionsBrowser from './components/SanctionsBrowser';
import AdminPanel from './components/AdminPanel';
import { Client, SanctionEntry, SystemLog, RiskLevel, EntityType, AppSettings, KYCIndividual } from './types';
import { generateMockSanctions, QATAR_MOCK_SANCTIONS } from './services/mockData';
import { screenClient } from './services/screeningEngine';
import { fetchFromUrl, parseUNSanctionsXML, OFFICIAL_UN_XML_URL } from './services/unSanctionsService';
import { initSupabase, fetchCloudClients, addCloudClient, deleteCloudClient, updateCloudClient, subscribeToClients, unsubscribeFromClients } from './services/cloudDb';

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: true,
  syncIntervalMinutes: 1440, // 24 hours
  sourceUrl: OFFICIAL_UN_XML_URL,
  lastSync: 'Never',
  nextSync: new Date(Date.now() + 86400000).toISOString()
};

const App: React.FC = () => {
  // --- STATE ---
  const [clients, setClients] = useState<Client[]>([]);
  const [sanctions, setSanctions] = useState<SanctionEntry[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // --- LOGIC ---
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

    // 1. Screen the Entity itself
    const entityMatch = screenClient(client, sanctionList);
    if (entityMatch) {
      highestRisk = entityMatch.riskLevel;
      mainMatchId = entityMatch.sanctionId;
      allMatches.push(`Entity: ${entityMatch.sanctionId}`);
    }

    // 2. Screen all people
    const personSets: { label: string, people: KYCIndividual[] }[] = [
      { label: 'Shareholder', people: client.shareholders },
      { label: 'UBO', people: client.ubos },
      { label: 'Signatory', people: client.signatories }
    ];

    for (const set of personSets) {
      for (const p of set.people) {
        if (!p.name) continue;
        // Mock a Client structure for individual screening
        const mockClient: any = {
          firstName: p.name,
          lastName: '',
          nationality: p.nationality,
          dob: p.dob,
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

    return {
      ...client,
      lastScreenedAt: new Date().toISOString(),
      riskLevel: highestRisk,
      matchId: mainMatchId,
      matches: allMatches
    };
  }, []);

  // Dedicated function to fetch clients based on current connection status
  const refreshClients = useCallback(async () => {
    if (isCloudConnected) {
      try {
        const cloudClients = await fetchCloudClients();
        if (cloudClients) {
          setClients(cloudClients);
        }
      } catch (err: any) {
        console.error("Cloud fetch error during refresh", err);
        if (err.message && (err.message.includes("does not exist") || err.message.includes("column"))) {
           setCloudError("Database Schema Mismatch: The table structure in Supabase is outdated. Please run the SQL Script in Admin Panel.");
        }
        addLog('CLOUD_ERROR', `Failed to sync clients: ${err.message}`, 'FAILURE');
      }
    } else {
      const storedClients = localStorage.getItem('unsg_clients');
      if (storedClients) {
        setClients(JSON.parse(storedClients));
      }
    }
  }, [isCloudConnected, addLog]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    let importedSettings: Partial<AppSettings> | null = null;

    if (configParam) {
      try {
        const jsonStr = atob(configParam);
        const config = JSON.parse(jsonStr);
        if (config.supabaseUrl && config.supabaseKey) {
           importedSettings = { supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey };
           window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
      } catch (e) { console.error("Invalid config param"); }
    }

    const storedClients = localStorage.getItem('unsg_clients');
    const storedSanctions = localStorage.getItem('unsg_sanctions');
    const storedLogs = localStorage.getItem('unsg_logs');
    const storedSettings = localStorage.getItem('unsg_settings');

    let currentSettings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
    if (importedSettings) {
      currentSettings = { ...currentSettings, ...importedSettings };
      localStorage.setItem('unsg_settings', JSON.stringify(currentSettings));
    }
    setSettings(currentSettings);

    const connected = initSupabase(currentSettings);
    setIsCloudConnected(connected);

    const initialLoad = async () => {
      setCloudError(null); 
      if (connected) {
        try {
           const cloudClients = await fetchCloudClients();
           if (cloudClients) setClients(cloudClients);
        } catch(e: any) {
           if (storedClients) setClients(JSON.parse(storedClients));
        }
      } else {
        if (storedClients) setClients(JSON.parse(storedClients));
      }
    };

    initialLoad();

    if (storedSanctions) {
      setSanctions(JSON.parse(storedSanctions));
    } else {
      setSanctions([...generateMockSanctions(10), ...QATAR_MOCK_SANCTIONS]);
    }

    if (storedLogs) setLogs(JSON.parse(storedLogs));
  }, []);

  useEffect(() => {
    if (isCloudConnected) refreshClients();
  }, [isCloudConnected, refreshClients]);

  useEffect(() => {
    let subscription: any = null;
    if (isCloudConnected) {
      subscription = subscribeToClients(() => {
        addLog('CLOUD_SYNC', 'Realtime update received from cloud.', 'SUCCESS');
        refreshClients();
      });
    }
    return () => { if (subscription) unsubscribeFromClients(subscription); };
  }, [isCloudConnected, refreshClients, addLog]);

  useEffect(() => { localStorage.setItem('unsg_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('unsg_sanctions', JSON.stringify(sanctions)); }, [sanctions]);
  useEffect(() => { localStorage.setItem('unsg_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('unsg_settings', JSON.stringify(settings)); }, [settings]);

  const handleUpdateSanctions = async () => {
    setIsUpdating(true);
    addLog('SANCTION_UPDATE', 'Starting sync from sources...', 'SUCCESS');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      let newUnData: SanctionEntry[] = [];
      try {
        if (settings.sourceUrl) {
           newUnData = await fetchFromUrl(settings.sourceUrl);
        }
      } catch (err) {
        newUnData = generateMockSanctions(50);
      }
      const combinedData = [...newUnData, ...QATAR_MOCK_SANCTIONS];
      setSanctions(combinedData);
      
      const updatedClients = clients.map(c => runScreening(c, combinedData));
      if (isCloudConnected) {
        updatedClients.forEach(c => updateCloudClient(c).catch(e => console.error("Update fail", e)));
      }
      setClients(updatedClients);
      addLog('SANCTION_UPDATE', `Sync Complete. ${combinedData.length} total records.`, 'SUCCESS');
    } catch (error) { addLog('SANCTION_UPDATE', 'Critical failure during sync.', 'FAILURE'); }
    finally { setIsUpdating(false); }
  };

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
        addLog('CLOUD_ADD', `Onboarding complete and synced to cloud.`, 'SUCCESS');
      } catch (e: any) {
        addLog('CLOUD_ERROR', `Cloud sync failed: ${e.message}`, 'FAILURE');
      }
    }
    setClients(prev => [newClient, ...prev]);
  };

  const handleDeleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    if (isCloudConnected) await deleteCloudClient(id).catch(e => console.error(e));
  };

  return (
    <Router>
      <Layout cloudError={cloudError} isCloudConnected={isCloudConnected}>
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} sanctionsCount={sanctions.length} />} />
          <Route path="/clients" element={<ClientManager clients={clients} onAddClient={handleAddClient} onDeleteClient={handleDeleteClient} onRefresh={refreshClients} />} />
          <Route path="/sanctions" element={<SanctionsBrowser sanctions={sanctions} lastUpdated={settings.lastSync} onRefresh={handleUpdateSanctions} isUpdating={isUpdating} onFileUpload={() => {}} />} />
          <Route path="/admin" element={<AdminPanel logs={logs} settings={settings} onUpdateSettings={setSettings} onTriggerSync={handleUpdateSanctions} isSyncing={isUpdating} onExportData={() => {}} onImportData={() => {}} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;