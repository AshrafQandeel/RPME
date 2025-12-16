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

  const runScreening = useCallback((clientList: Client[], sanctionList: SanctionEntry[]) => {
    return clientList.map(client => {
      const match = screenClient(client, sanctionList);
      return {
        ...client,
        lastScreenedAt: new Date().toISOString(),
        riskLevel: match ? match.riskLevel : RiskLevel.NONE,
        matchId: match ? match.sanctionId : undefined
      };
    });
  }, []);

  // Dedicated function to fetch clients based on current connection status
  const refreshClients = useCallback(async () => {
    if (isCloudConnected) {
      try {
        const cloudClients = await fetchCloudClients();
        if (cloudClients) {
          setClients(cloudClients);
          // Only log if it's a significant load, to avoid spamming logs on every realtime update
          // addLog('CLOUD_SYNC', `Synced ${cloudClients.length} clients from Supabase.`, 'SUCCESS');
        }
      } catch (err: any) {
        console.error("Cloud fetch error during refresh", err);
        // Detect Schema Mismatch specifically
        if (err.message && (err.message.includes("does not exist") || err.message.includes("column"))) {
           setCloudError("Database Schema Mismatch: The table structure in Supabase is outdated. Please run the SQL Script in Admin Panel.");
        }
        addLog('CLOUD_ERROR', `Failed to sync clients: ${err.message}`, 'FAILURE');
      }
    } else {
      // Local fallback reload
      const storedClients = localStorage.getItem('unsg_clients');
      if (storedClients) {
        setClients(JSON.parse(storedClients));
        addLog('LOCAL_LOAD', 'Reloaded clients from local storage.', 'SUCCESS');
      }
    }
  }, [isCloudConnected, addLog]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load local storage first
    const storedClients = localStorage.getItem('unsg_clients');
    const storedSanctions = localStorage.getItem('unsg_sanctions');
    const storedLogs = localStorage.getItem('unsg_logs');
    const storedSettings = localStorage.getItem('unsg_settings');

    let currentSettings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
    setSettings(currentSettings);

    // Init Cloud if credentials exist
    const connected = initSupabase(currentSettings);
    setIsCloudConnected(connected);

    // Initial Data Load Logic (runs once on mount)
    const initialLoad = async () => {
      setCloudError(null); 
      if (connected) {
        try {
           const cloudClients = await fetchCloudClients();
           if (cloudClients) {
             setClients(cloudClients);
             addLog('CLOUD_SYNC', `Loaded ${cloudClients.length} clients from Supabase.`, 'SUCCESS');
           }
        } catch(e: any) {
           if (e.message && (e.message.includes("does not exist") || e.message.includes("column"))) {
             setCloudError("Database Schema Mismatch: Run SQL Script in Admin.");
           }
           // Fallback to local on error
           if (storedClients) setClients(JSON.parse(storedClients));
        }
      } else {
        // Local Mode
        if (storedClients) setClients(JSON.parse(storedClients));
        else {
            const seedClients: Client[] = [
                {
                    id: '1', firstName: 'John', lastName: 'Doe', nationality: 'USA', type: 'Individual' as any,
                    residenceCountry: 'USA', createdAt: new Date().toISOString(), riskLevel: RiskLevel.NONE
                },
                {
                    id: '2', firstName: 'Victor', lastName: 'Bout', nationality: 'Russia', type: 'Individual' as any,
                    residenceCountry: 'Russia', createdAt: new Date().toISOString(), riskLevel: RiskLevel.NONE
                }
            ];
            setClients(seedClients);
        }
      }
    };

    initialLoad();

    if (storedSanctions) {
      setSanctions(JSON.parse(storedSanctions));
    } else {
      const initialSanctions = [...generateMockSanctions(10), ...QATAR_MOCK_SANCTIONS];
      setSanctions(initialSanctions);
    }

    if (storedLogs) setLogs(JSON.parse(storedLogs));
    
    addLog('SYSTEM_INIT', `Application started. Cloud Mode: ${connected ? 'Active' : 'Offline'}`, 'SUCCESS');
  }, [addLog]);

  // Reactive Effect: Fetch clients whenever cloud connection is established (e.g. after entering settings)
  useEffect(() => {
    if (isCloudConnected) {
      refreshClients();
    }
  }, [isCloudConnected, refreshClients]);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    let subscription: any = null;

    if (isCloudConnected) {
      // Subscribe to changes in the 'clients' table
      subscription = subscribeToClients(() => {
        console.log("Realtime event received, refreshing data...");
        addLog('CLOUD_SYNC', 'Realtime update received from cloud.', 'SUCCESS');
        refreshClients();
      });
    }

    return () => {
      if (subscription) {
        unsubscribeFromClients(subscription);
      }
    };
  }, [isCloudConnected, refreshClients, addLog]);


  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('unsg_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('unsg_sanctions', JSON.stringify(sanctions));
  }, [sanctions]);
  
  useEffect(() => {
    localStorage.setItem('unsg_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('unsg_settings', JSON.stringify(settings));
    // Re-init Supabase if settings change
    const connected = initSupabase(settings);
    setIsCloudConnected(connected);
    if (connected) setCloudError(null);
  }, [settings]);


  // --- AUTO SYNC SCHEDULER ---
  useEffect(() => {
    if (!settings.autoSync) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const nextSync = new Date(settings.nextSync);

      if (now >= nextSync && !isUpdating) {
        handleUpdateSanctions();
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [settings, isUpdating]);

  const handleUpdateSanctions = async () => {
    setIsUpdating(true);
    addLog('SANCTION_UPDATE', 'Starting sync from configured sources...', 'SUCCESS');

    try {
      // 1. Fetch from Qatar (Simulated)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const fetchedQatarData = [...QATAR_MOCK_SANCTIONS]; 

      // 2. Fetch from UN
      let newUnData: SanctionEntry[] = [];
      try {
        if (settings.sourceUrl) {
           try {
             newUnData = await fetchFromUrl(settings.sourceUrl);
             addLog('SANCTION_UPDATE', `Successfully fetched live UN XML.`, 'SUCCESS');
           } catch (fetchErr) {
             console.warn("CORS/Network error fetching real XML, using mock generator for demo continuity.", fetchErr);
             throw new Error("CORS restricted in browser-only mode. Switching to Simulation.");
           }
        }
      } catch (err) {
        addLog('SANCTION_UPDATE', 'Direct fetch restricted (CORS). Using simulation data.', 'WARNING');
        newUnData = generateMockSanctions(50 + (sanctions.filter(s => s.source === 'UN Consolidated').length));
      }

      const combinedData = [...newUnData, ...fetchedQatarData];
      setSanctions(combinedData);
      
      // Update Screening
      const updatedClients = runScreening(clients, combinedData);
      
      // If cloud connected, update clients in cloud with new screening results
      if (isCloudConnected) {
        // Doing this for all clients might be heavy, but ok for demo
        updatedClients.forEach(c => updateCloudClient(c).catch(e => console.error("Update fail", e)));
      }

      setClients(updatedClients);
      const matchCount = updatedClients.filter(c => c.riskLevel !== RiskLevel.NONE).length;

      // Update Settings Timestamps
      const now = new Date();
      const next = new Date(now.getTime() + settings.syncIntervalMinutes * 60000);
      setSettings(prev => ({
        ...prev,
        lastSync: now.toISOString(),
        nextSync: next.toISOString()
      }));

      addLog('SANCTION_UPDATE', `Sync Complete. ${combinedData.length} total records. Found ${matchCount} matches.`, 'SUCCESS');

    } catch (error) {
      addLog('SANCTION_UPDATE', 'Critical failure during sync process.', 'FAILURE');
    } finally {
      setIsUpdating(false);
    }
  };

  // --- MANUAL XML IMPORT ---
  const handleFileUpload = async (file: File) => {
    setIsUpdating(true);
    addLog('IMPORT', `Starting manual import of ${file.name}...`, 'SUCCESS');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const xmlContent = e.target?.result as string;
        const parsedEntries = parseUNSanctionsXML(xmlContent);
        
        if (parsedEntries.length === 0) {
          throw new Error("No valid entries found in XML.");
        }

        const otherEntries = sanctions.filter(s => s.source !== 'UN Consolidated');
        const combinedData = [...otherEntries, ...parsedEntries];
        
        setSanctions(combinedData);
        
        const updatedClients = runScreening(clients, combinedData);
        setClients(updatedClients);
        
        setSettings(prev => ({ ...prev, lastSync: new Date().toISOString() }));
        addLog('IMPORT', `Successfully imported ${parsedEntries.length} UN entries from file.`, 'SUCCESS');
      } catch (err: any) {
        addLog('IMPORT', `Failed to parse XML file: ${err.message}`, 'FAILURE');
      } finally {
        setIsUpdating(false);
      }
    };
    reader.readAsText(file);
  };

  // --- EXPORT DATABASE ---
  const handleExportDatabase = () => {
    const backupData = {
      meta: {
        version: '1.2.0',
        exportDate: new Date().toISOString(),
        appName: 'UNSanctionGuard'
      },
      data: {
        clients,
        sanctions,
        settings,
        logs
      }
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UNSG-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('DB_BACKUP', 'System data exported to JSON file.', 'SUCCESS');
  };

  // --- IMPORT DATABASE ---
  const handleImportDatabase = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.meta || parsed.meta.appName !== 'UNSanctionGuard' || !parsed.data) {
          throw new Error("Invalid backup file format.");
        }

        const { clients: newClients, sanctions: newSanctions, settings: newSettings, logs: newLogs } = parsed.data;

        if (newClients) setClients(newClients);
        if (newSanctions) setSanctions(newSanctions);
        if (newSettings) setSettings(newSettings);
        if (newLogs) setLogs(newLogs);

        addLog('DB_RESTORE', `System restored from backup dated ${parsed.meta.exportDate}`, 'SUCCESS');
      } catch (err: any) {
        alert("Failed to restore backup: " + err.message);
        addLog('DB_RESTORE', `Restore failed: ${err.message}`, 'FAILURE');
      }
    };
    reader.readAsText(file);
  };

  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => {
    const newClient: Client = {
      ...newClientData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      riskLevel: RiskLevel.NONE
    };

    const match = screenClient(newClient, sanctions);
    if (match) {
        newClient.riskLevel = match.riskLevel;
        newClient.matchId = match.sanctionId;
        newClient.lastScreenedAt = new Date().toISOString();
        addLog('CLIENT_ADD', `Added ${newClient.firstName} ${newClient.lastName} - MATCH FOUND (${match.riskLevel})`, 'WARNING');
    } else {
        addLog('CLIENT_ADD', `Added ${newClient.firstName} ${newClient.lastName} - Clean`, 'SUCCESS');
    }

    if (isCloudConnected) {
      try {
        await addCloudClient(newClient);
        addLog('CLOUD_ADD', `Client synced to cloud DB.`, 'SUCCESS');
      } catch (e: any) {
        console.error("Cloud save failed", e);
        // If save fails due to schema, set error
        if (e.message && (e.message.includes("does not exist") || e.message.includes("column"))) {
            setCloudError("Database Schema Mismatch: The table structure in Supabase is outdated. Please run the SQL Script in Admin Panel.");
        }
        addLog('CLOUD_ERROR', `Failed to save to cloud: ${e.message}`, 'FAILURE');
      }
    }

    setClients(prev => [newClient, ...prev]);
  };

  const handleDeleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    addLog('CLIENT_DELETE', `Deleted client ${id}`, 'SUCCESS');

    if (isCloudConnected) {
      try {
        await deleteCloudClient(id);
      } catch (e: any) {
        addLog('CLOUD_ERROR', `Failed to delete from cloud: ${e.message}`, 'FAILURE');
      }
    }
  };

  return (
    <Router>
      <Layout cloudError={cloudError} isCloudConnected={isCloudConnected}>
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} sanctionsCount={sanctions.length} />} />
          <Route 
            path="/clients" 
            element={
              <ClientManager 
                clients={clients} 
                onAddClient={handleAddClient} 
                onDeleteClient={handleDeleteClient} 
                onRefresh={refreshClients}
              />
            } 
          />
          <Route 
            path="/sanctions" 
            element={
              <SanctionsBrowser 
                sanctions={sanctions} 
                lastUpdated={settings.lastSync} 
                onRefresh={handleUpdateSanctions} 
                isUpdating={isUpdating} 
                onFileUpload={handleFileUpload}
              />
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminPanel 
                logs={logs} 
                settings={settings}
                onUpdateSettings={setSettings}
                onTriggerSync={handleUpdateSanctions}
                isSyncing={isUpdating}
                onExportData={handleExportDatabase}
                onImportData={handleImportDatabase}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;