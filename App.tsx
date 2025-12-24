
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Added missing ShieldCheck import from lucide-react
import { ShieldCheck } from 'lucide-react';
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
  const [connectionStatus, setConnectionStatus] = useState<'LOCAL' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('LOCAL');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
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

  // Handle URL-based Configuration Import
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const setupConfig = params.get('setup');
    
    if (setupConfig) {
      try {
        const decoded = JSON.parse(atob(setupConfig));
        if (decoded.url && decoded.key) {
          const newSettings = {
            ...settings,
            supabaseUrl: decoded.url,
            supabaseKey: decoded.key
          };
          setSettings(newSettings);
          localStorage.setItem('unsg_settings', JSON.stringify(newSettings));
          setSetupMessage("Cloud configuration imported successfully from link!");
          addLog('SYSTEM', 'Database configuration imported via setup link.', 'SUCCESS');
          
          // Clean the URL
          window.history.replaceState(null, '', window.location.hash.split('?')[0]);
          setTimeout(() => setSetupMessage(null), 5000);
        }
      } catch (e) {
        console.error("Failed to decode setup config", e);
        addLog('SYSTEM', 'Failed to import configuration: Invalid link format.', 'FAILURE');
      }
    }
  }, []);

  const refreshClients = useCallback(async (isConnected: boolean) => {
    if (isConnected) {
      try {
        const cloudClients = await fetchCloudClients();
        if (cloudClients) {
          setClients(cloudClients);
          setCloudError(null);
          addLog('CLOUD_SYNC', `Synced ${cloudClients.length} clients from cloud.`, 'SUCCESS');
        }
      } catch (err: any) {
        setCloudError(`Cloud Fetch Error: ${err.message || 'Check database permissions'}`);
        addLog('CLOUD_ERROR', `Cloud fetch failed.`, 'FAILURE');
      }
    } else {
      const stored = localStorage.getItem('unsg_clients');
      if (stored) setClients(JSON.parse(stored));
      else setClients([]);
    }
  }, [addLog]);

  // Handle Cloud Connection Lifecycle
  useEffect(() => {
    const connectToCloud = async () => {
      const hasConfig = settings.supabaseUrl && settings.supabaseKey;
      
      if (!hasConfig) {
        setConnectionStatus('LOCAL');
        refreshClients(false);
        return;
      }

      setConnectionStatus('CONNECTING');
      const initialized = initSupabase(settings);
      
      if (initialized) {
        const healthy = await checkConnection();
        if (healthy) {
          setConnectionStatus('CONNECTED');
          setCloudError(null);
          await refreshClients(true);
          
          // Setup Realtime
          if (subscriptionRef.current) unsubscribeFromClients(subscriptionRef.current);
          subscriptionRef.current = subscribeToClients(() => refreshClients(true));
        } else {
          setConnectionStatus('ERROR');
          setCloudError("Connection established but 'clients' table not found or accessible.");
          refreshClients(false);
        }
      } else {
        setConnectionStatus('ERROR');
        setCloudError("Invalid Supabase configuration URL or Key.");
        refreshClients(false);
      }
    };

    connectToCloud();
    localStorage.setItem('unsg_settings', JSON.stringify(settings));

    return () => {
      if (subscriptionRef.current) unsubscribeFromClients(subscriptionRef.current);
    };
  }, [settings, refreshClients]);

  // Sanctions load
  useEffect(() => {
    const storedSanctions = localStorage.getItem('unsg_sanctions');
    if (storedSanctions) setSanctions(JSON.parse(storedSanctions));
    else setSanctions([...generateMockSanctions(10), ...QATAR_MOCK_SANCTIONS]);
  }, []);

  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => {
    const newClient: Client = { 
      ...newClientData as any, 
      id: Math.random().toString(36).substr(2, 9), 
      createdAt: new Date().toISOString(), 
      riskLevel: RiskLevel.NONE 
    };
    
    if (connectionStatus === 'CONNECTED') {
      try {
        await addCloudClient(newClient);
      } catch (e: any) {
        addLog('CLOUD_ERROR', e.message, 'FAILURE');
      }
    } else {
      setClients(prev => [newClient, ...prev]);
      localStorage.setItem('unsg_clients', JSON.stringify([newClient, ...clients]));
    }
  };

  return (
    <Router>
      <Layout 
        cloudError={cloudError} 
        isCloudConnected={connectionStatus === 'CONNECTED'} 
        isConnecting={connectionStatus === 'CONNECTING'}
      >
        {setupMessage && (
          <div className="fixed top-20 right-8 z-50 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-8 duration-500 flex items-center gap-3">
            <ShieldCheck size={24} />
            <span className="font-bold">{setupMessage}</span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} sanctionsCount={sanctions.length} />} />
          <Route path="/clients" element={<ClientManager 
            clients={clients} 
            onAddClient={handleAddClient} 
            onDeleteClient={async id => {
              if (connectionStatus === 'CONNECTED') await deleteCloudClient(id).catch(e => addLog('CLOUD_ERROR', e.message, 'FAILURE'));
              else setClients(prev => prev.filter(c => c.id !== id));
            }} 
            onRefresh={() => refreshClients(connectionStatus === 'CONNECTED')} 
          />} />
          <Route path="/sanctions" element={<SanctionsBrowser sanctions={sanctions} lastUpdated={settings.lastSync} onRefresh={() => {}} isUpdating={isUpdating} onFileUpload={() => {}} />} />
          <Route path="/admin" element={<AdminPanel logs={logs} settings={settings} onUpdateSettings={setSettings} onTriggerSync={() => {}} isSyncing={isUpdating} onExportData={() => {}} onImportData={() => {}} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
