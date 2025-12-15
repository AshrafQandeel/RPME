import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import SanctionsBrowser from './components/SanctionsBrowser';
import AdminPanel from './components/AdminPanel';
import { Client, SanctionEntry, SystemLog, RiskLevel, EntityType } from './types';
import { generateMockSanctions, QATAR_MOCK_SANCTIONS } from './services/mockData';
import { screenClient } from './services/screeningEngine';

const QATAR_NCTC_URL = "https://portal.moi.gov.qa/wps/portal/NCTC/sanctionlist/unifiedsanctionlist/!ut/p/a1/hc29DsIgAATgZ_EJOIG2dqSkASKINSRWlobJkGh1MD6_-LOqt13yXY5EMpI4p3s-plu-zOn07LGeTEs51ZxaL7nAwDoTHHNQqirgUEClba_4GhvVhA6DpzrUO02B5b_9nsQ3Ec6Acljfy0JaHbRkwGrbfMCvixfAlwiQ63lENmLxAKkSZVg!/dl5/d5/L2dBISEvZ0FBIS9nQSEh/";

const App: React.FC = () => {
  // --- STATE ---
  const [clients, setClients] = useState<Client[]>([]);
  const [sanctions, setSanctions] = useState<SanctionEntry[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  const [isUpdating, setIsUpdating] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Simulate loading data from local storage or backend
    const storedClients = localStorage.getItem('unsg_clients');
    const storedSanctions = localStorage.getItem('unsg_sanctions');
    const storedLogs = localStorage.getItem('unsg_logs');

    if (storedClients) setClients(JSON.parse(storedClients));
    else {
        // Seed some initial clients
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

    if (storedSanctions) {
      setSanctions(JSON.parse(storedSanctions));
      setLastUpdated(new Date().toISOString());
    } else {
      // Initial mock load including Qatar data
      const initialSanctions = [...generateMockSanctions(10), ...QATAR_MOCK_SANCTIONS];
      setSanctions(initialSanctions);
      setLastUpdated(new Date().toISOString());
    }

    if (storedLogs) setLogs(JSON.parse(storedLogs));
    
    addLog('SYSTEM_INIT', 'Application started.', 'SUCCESS');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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


  // --- LOGIC ---
  const addLog = (action: string, details: string, status: 'SUCCESS' | 'FAILURE' | 'WARNING') => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      details,
      status
    };
    setLogs(prev => [...prev, newLog]);
  };

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

  // Effect to re-screen when sanctions update
  useEffect(() => {
    if (sanctions.length > 0 && clients.length > 0) {
       // Check if we need to re-screen. 
       // For this demo, we'll do it if there's a client without lastScreenedAt, OR just passively.
       // However, to avoid infinite loops, we usually don't setClients inside useEffect dependent on clients.
       // We will do screening only on explicit actions (Add Client, Update Sanctions).
    }
  }, [sanctions]);


  const handleAddClient = (newClientData: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => {
    const newClient: Client = {
      ...newClientData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      riskLevel: RiskLevel.NONE
    };

    // Immediate Screen
    const match = screenClient(newClient, sanctions);
    if (match) {
        newClient.riskLevel = match.riskLevel;
        newClient.matchId = match.sanctionId;
        newClient.lastScreenedAt = new Date().toISOString();
        addLog('CLIENT_ADD', `Added ${newClient.firstName} ${newClient.lastName} - MATCH FOUND (${match.riskLevel}) against ${match.sanctionId}`, 'WARNING');
    } else {
        addLog('CLIENT_ADD', `Added ${newClient.firstName} ${newClient.lastName} - Clean`, 'SUCCESS');
    }

    setClients(prev => [newClient, ...prev]);
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    addLog('CLIENT_DELETE', `Deleted client ${id}`, 'SUCCESS');
  };

  const handleUpdateSanctions = async () => {
    setIsUpdating(true);
    addLog('SANCTION_UPDATE', 'Starting sync from UN and Qatar NCTC...', 'SUCCESS');

    // Simulate API delay for UN
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate Fetch from Qatar NCTC
    try {
        addLog('SANCTION_UPDATE', `Fetching Qatar NCTC data from: ${QATAR_NCTC_URL.substring(0, 40)}...`, 'SUCCESS');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency
        
        // Mocking the successful fetch and parse of Qatar data
        // In a real implementation, we would use: const res = await fetch(QATAR_NCTC_URL);
        const fetchedQatarData: SanctionEntry[] = [
            ...QATAR_MOCK_SANCTIONS,
            {
                dataId: `QA-LIVE-${Date.now()}`,
                source: 'Qatar NCTC',
                firstName: 'IMPORTED',
                lastName: 'SUSPECT',
                unListType: 'National',
                referenceNumber: `NCTC.LIVE.${Math.floor(Math.random() * 1000)}`,
                listedOn: new Date().toISOString().split('T')[0],
                comments: 'Live import simulation',
                nationality: 'Qatar',
                aliases: [],
                type: EntityType.INDIVIDUAL
            }
        ];

        // Simulate receiving new UN data
        const newUnData = generateMockSanctions(50 + (sanctions.filter(s => s.source === 'UN Consolidated').length));
        
        const combinedData = [...newUnData, ...fetchedQatarData];
        
        setSanctions(combinedData);
        setLastUpdated(new Date().toISOString());
        
        // Re-screen ALL clients
        const updatedClients = runScreening(clients, combinedData);
        setClients(updatedClients);

        const matchCount = updatedClients.filter(c => c.riskLevel !== RiskLevel.NONE).length;

        addLog('SANCTION_UPDATE', `Sync Complete. ${combinedData.length} total records (${fetchedQatarData.length} from Qatar). Found ${matchCount} matches.`, 'SUCCESS');
    } catch (error) {
        addLog('SANCTION_UPDATE', 'Failed to fetch Qatar NCTC data. Network Error.', 'FAILURE');
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} sanctionsCount={sanctions.length} />} />
          <Route path="/clients" element={<ClientManager clients={clients} onAddClient={handleAddClient} onDeleteClient={handleDeleteClient} />} />
          <Route path="/sanctions" element={<SanctionsBrowser sanctions={sanctions} lastUpdated={lastUpdated} onRefresh={handleUpdateSanctions} isUpdating={isUpdating} />} />
          <Route path="/admin" element={<AdminPanel logs={logs} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;