
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { initSupabase, fetchCloudClients, addCloudClient, deleteCloudClient, subscribeToClients, unsubscribeFromClients, checkConnection } from './services/cloudDb';

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
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem('unsg_settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

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

  const refreshClients = useCallback(async (isCurrentlyConnected: boolean) => {
    if (isCurrentlyConnected) {
      try {
        const cloudClients = await fetchCloudClients();
        if (cloudClients) {
          setClients(cloudClients);
          setCloudError(null);
          addLog('CLOUD_SYNC', `Successfully fetched ${cloudClients.length} clients from cloud.`, 'SUCCESS');
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setCloudError(`Database Error: ${err.message || 'Could not reach table'}`);
        addLog('CLOUD_ERROR', `Sync failed: ${err.message}`, 'FAILURE');
      }
    } else {
      const stored = localStorage.getItem('unsg_clients');
      if (stored) {
        setClients(JSON.parse(stored));
      } else {
        setClients([]);
      }
    }
  }, [addLog]);

  // Handle Cloud Connection Lifecycle
  useEffect(() => {
    const connect = async () => {
      const hasConfig = settings.supabaseUrl && settings.supabaseKey;
      if (hasConfig) {
        const initialized = initSupabase(settings);
        if (initialized) {
          const isHealthy = await checkConnection();
          setIsCloudConnected(isHealthy);
          if (isHealthy) {
            setCloudError(null);
            await refreshClients(true);
            
            // Setup Realtime
            if (subscriptionRef.current) unsubscribeFromClients(subscriptionRef.current);
            subscriptionRef.current = subscribeToClients(() => refreshClients(true));
          } else {
            setCloudError("Database connection failed. Check your URL/Key or table schema.");
            refreshClients(false);
          }
        } else {
          setIsCloudConnected(false);
          refreshClients(false);
        }
      } else {
        setIsCloudConnected(false);
        refreshClients(false);
      }
    };

    connect();
    localStorage.setItem('unsg_settings', JSON.stringify(settings));

    return () => {
      if (subscriptionRef.current) unsubscribeFromClients(subscriptionRef.current);
    };
  }, [settings, refreshClients]);

  // Initial sanctions load
  useEffect(() => {
    const storedSanctions = localStorage.getItem('unsg_sanctions');
    if (storedSanctions) setSanctions(JSON.parse(storedSanctions));
    else setSanctions([...generateMockSanctions(10), ...QATAR_MOCK_SANCTIONS]);
  }, []);

  // Sync local cache when not connected
  useEffect(() => { 
    if (!isCloudConnected && clients.length > 0) {
      localStorage.setItem('unsg_clients', JSON.stringify(clients)); 
    }
  }, [clients, isCloudConnected]);

  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => {
    const newClient: Client = { 
      ...newClientData as any, 
      id: Math.random().toString(36).substr(2, 9), 
      createdAt: new Date().toISOString(), 
      riskLevel: RiskLevel.NONE 
    };
    
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

  return (
    <Router>
      <Layout cloudError={cloudError} isCloudConnected={isCloudConnected}>
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} sanctionsCount={sanctions.length} />} />
          <Route path="/clients" element={<ClientManager clients={clients} onAddClient={handleAddClient} onDeleteClient={async id => {
            if (isCloudConnected) await deleteCloudClient(id).catch(e => addLog('CLOUD_ERROR', e.message, 'FAILURE'));
            else setClients(prev => prev.filter(c => c.id !== id));
          }} onRefresh={() => refreshClients(isCloudConnected)} />} />
          <Route path="/sanctions" element={<SanctionsBrowser sanctions={sanctions} lastUpdated={settings.lastSync} onRefresh={() => {}} isUpdating={isUpdating} onFileUpload={() => {}} />} />
          <Route path="/admin" element={<AdminPanel logs={logs} settings={settings} onUpdateSettings={setSettings} onTriggerSync={() => {}} isSyncing={isUpdating} onExportData={() => {}} onImportData={() => {}} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
