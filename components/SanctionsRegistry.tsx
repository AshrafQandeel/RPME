
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SanctionEntry, SystemEnvironment, IngestionLog, UserRole, EntityType } from '../types';
import { 
  RefreshCw, Search, Cpu, Globe, Upload, Layers, X, 
  CheckCircle, AlertTriangle, Loader2, FileJson, 
  Table as TableIcon, FileCode, CheckCircle2, ChevronRight,
  Database, Info, ArrowRight, ShieldCheck, MapPin, 
  Settings2, FileSpreadsheet, CloudDownload, ChevronLeft,
  Zap, Activity, ShieldAlert, Binary, History, ExternalLink
} from 'lucide-react';
import { 
  fetchSanctionsTotalCount, 
  upsertCloudSanctions, 
  deleteStaleSanctions,
  deduplicateDatabase,
  setGlobalSyncLock, 
  logIngestionEvent, 
  fetchIngestionLogs, 
  searchSanctionsAuthoritative,
  logAuditEvent,
  fetchGlobalSyncStatus
} from '../services/cloudDb';
import { 
  fetchAndNormalize, 
  detectFormat, 
  parseUNSanctionsXML, 
  parseCSVToSanctions, 
  parseExcelToSanctions, 
  mapFieldsToSanction, 
  OFFICIAL_UN_XML_URL, 
  QATAR_NCTC_PORTAL_URL, 
  OPENSANCTIONS_URL 
} from '../services/unSanctionsService';

interface SanctionsRegistryProps {
  onSyncComplete: () => void;
  isCloudConnected: boolean;
  initialStats?: { lastSourceUpdate: string };
  isGlobalSyncing?: boolean;
  environment?: SystemEnvironment;
  currentUser?: { role: UserRole; id: string; email: string };
}

const ITEMS_PER_PAGE = 15;

const REQUIRED_SYSTEM_FIELDS = [
  { key: 'firstName', label: 'First Name / Primary Identity' },
  { key: 'lastName', label: 'Last Name / Surname' },
  { key: 'dataId', label: 'Reference ID / Data ID' },
  { key: 'nationality', label: 'Nationality / Jurisdiction' },
  { key: 'referenceNumber', label: 'Official Ref Number' },
  { key: 'comments', label: 'Comments / Details' },
  { key: 'type', label: 'Entity Type (Individual/Corporate)' }
];

const SanctionsRegistry: React.FC<SanctionsRegistryProps> = ({ onSyncComplete, isCloudConnected, isGlobalSyncing: globalSyncActive, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'hub' | 'audit'>('hub');
  const [sanctions, setSanctions] = useState<SanctionEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalInDb, setTotalInDb] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'WORKING' | 'SUCCESS' | 'ERROR' | 'MAPPING' | 'PURGING'>('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ingestionCount, setIngestionCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ingestionHistory, setIngestionHistory] = useState<IngestionLog[]>([]);
  
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [pendingSource, setPendingSource] = useState('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (page: number, term: string) => {
    setIsSearching(true);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const response = await searchSanctionsAuthoritative(term, from, to);
      setSanctions(response.data);
      setTotalMatches(response.count);
      if (!term) setTotalInDb(response.count);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => performSearch(1, searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm, performSearch]);

  useEffect(() => {
    performSearch(currentPage, searchTerm);
  }, [currentPage, performSearch]);

  const refreshLogs = useCallback(async () => {
    const logs = await fetchIngestionLogs();
    setIngestionHistory(logs);
    const count = await fetchSanctionsTotalCount();
    setTotalInDb(count);
  }, []);

  useEffect(() => { refreshLogs(); }, [refreshLogs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('WORKING');
    setErrorMessage(null);
    setUploadProgress(1);

    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        const format = detectFormat(typeof content === 'string' ? content : '', fileName);
        
        if (format === 'UNKNOWN') throw new Error("Unsupported format. Use XML, CSV, Excel, or JSON.");

        let rawData: any[] = [];
        const batchTimestamp = new Date().toISOString();

        if (format === 'XML') {
          const entries = parseUNSanctionsXML(content as string, batchTimestamp);
          await commitSanctions(entries, fileName, 'Manual', batchTimestamp);
          return;
        } else if (format === 'JSON') {
          const parsed = JSON.parse(content as string);
          rawData = Array.isArray(parsed) ? parsed : (parsed.entities || parsed.data || [parsed]);
        } else if (format === 'CSV') {
          rawData = parseCSVToSanctions(content as string, fileName);
        } else if (format === 'EXCEL') {
          rawData = parseExcelToSanctions(content as ArrayBuffer, fileName);
        }

        if (rawData.length === 0) throw new Error("File contains no identifiable records.");

        setPendingData(rawData);
        setPendingSource(fileName);
        const headers = Object.keys(rawData[0]);
        setDetectedHeaders(headers);
        
        const initialMapping: Record<string, string> = {};
        REQUIRED_SYSTEM_FIELDS.forEach(sf => {
          const match = headers.find(h => {
            const lowH = h.toLowerCase().trim();
            const lowK = sf.key.toLowerCase();
            const lowL = sf.label.toLowerCase();
            
            // Exact matches first
            if (lowH === lowK || lowH === lowL) return true;
            
            // Fuzzy keyword matches
            if (lowK === 'firstname' && (lowH.includes('name') || lowH.includes('identity'))) return true;
            if (lowK === 'lastname' && lowH.includes('surname')) return true;
            if (lowK === 'dataid' && (lowH.includes('reference') || lowH.includes('id') || lowH.includes('permanent'))) return true;
            if (lowK === 'referencenumber' && (lowH.includes('ref') || lowH.includes('code'))) return true;
            if (lowK === 'comments' && (lowH.includes('comment') || lowH.includes('detail') || lowH.includes('info') || lowH.includes('note'))) return true;
            if (lowK === 'type' && (lowH.includes('entity') || lowH.includes('person') || lowH.includes('type') || lowH.includes('legal'))) return true;
            
            return lowH.includes(lowK) || lowL.includes(lowH);
          });
          if (match) initialMapping[sf.key] = match;
        });

        setFieldMapping(initialMapping);
        setStatus('MAPPING');
      } catch (err: any) {
        setErrorMessage(err.message);
        setStatus('ERROR');
      }
    };

    if (fileName.match(/\.(xlsx|xls)$/i)) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const executeMappedImport = async () => {
    if (pendingData.length === 0) return;
    setStatus('WORKING');
    
    try {
      const batchTimestamp = new Date().toISOString();
      const mappedEntries = pendingData.map(row => {
        const entry = mapFieldsToSanction(row, fieldMapping, pendingSource);
        return { ...entry, fetchDate: batchTimestamp };
      });
      await commitSanctions(mappedEntries, pendingSource, 'Manual', batchTimestamp);
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('ERROR');
    }
  };

  const commitSanctions = async (entries: SanctionEntry[], source: string, method: 'Automated' | 'Manual', batchTimestamp: string) => {
    const userHandle = currentUser?.email || currentUser?.id || 'System';
    
    // De-duplicate entries by dataId to prevent "ON CONFLICT DO UPDATE cannot affect row a second time"
    const uniqueEntriesMap = new Map<string, SanctionEntry>();
    entries.forEach(entry => {
      if (!uniqueEntriesMap.has(entry.dataId)) {
        uniqueEntriesMap.set(entry.dataId, entry);
      }
    });
    const uniqueEntries = Array.from(uniqueEntriesMap.values());
    
    setIngestionCount(uniqueEntries.length);
    try {
      await setGlobalSyncLock(true, `${method} Upload: ${source}`, 0, source);
      
      // Phase 1: Ingest new records
      await upsertCloudSanctions(uniqueEntries, p => {
        setUploadProgress(p);
        if (p % 10 === 0) setGlobalSyncLock(true, `${method} Upload: ${source}`, p, source);
      });
      
      // Phase 2: State Purge (Delete the old)
      setStatus('PURGING');
      await deleteStaleSanctions(source, batchTimestamp);
      
      // Phase 3: Global De-duplication
      const duplicateCount = await deduplicateDatabase();
      
      await setGlobalSyncLock(false, new Date().toLocaleString());
      
      await logIngestionEvent({ 
        timestamp: new Date().toISOString(), 
        source: source, 
        method: method, 
        status: 'Success', 
        recordsProcessed: entries.length, 
        duplicatesRemoved: duplicateCount,
        triggeredBy: userHandle
      });

      await logAuditEvent(
        method === 'Automated' ? 'REGISTRY_SYNC_FEED' : 'REGISTRY_MANUAL_IMPORT',
        `Registry Refreshed: ${uniqueEntries.length} new records. Filtered ${duplicateCount} duplicates. State synchronized.`,
        userHandle
      );

      setStatus('SUCCESS');
      onSyncComplete();
      refreshLogs();
      
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setStatus('IDLE');
        setUploadProgress(0);
      }, 5000);
    } catch (err: any) {
      await setGlobalSyncLock(false, "Sync Failed");
      setErrorMessage(err.message);
      setStatus('ERROR');
      await logAuditEvent('INGESTION_FAILURE', `Registry update failed for ${source}: ${err.message}`, userHandle);
    }
  };

  const handleFetch = async (url: string, name: string) => {
    setStatus('WORKING');
    setUploadProgress(5); 
    setErrorMessage(null);
    try {
      const batchTimestamp = new Date().toISOString();
      const data = await fetchAndNormalize(url, name, batchTimestamp);
      if (!data || data.length === 0) {
        throw new Error(`Feed ${name} returned 0 records. Process aborted.`);
      }
      await commitSanctions(data, name, 'Automated', batchTimestamp);
    } catch (err: any) {
      setErrorMessage(err.message || "Handshake failure.");
      setStatus('ERROR');
    }
  };

  const isIngesting = status === 'WORKING' || status === 'PURGING' || globalSyncActive;

  return (
    <div className="space-y-8 pb-20">
      {/* Registry Command Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm gap-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Database size={120} />
         </div>
         <div className="flex items-center gap-5 relative z-10">
            <div className={`p-4 rounded-2xl shadow-lg transition-colors duration-500 ${isIngesting ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-950 text-emerald-400'}`}>
               {isIngesting ? <RefreshCw size={28} className="animate-spin" /> : <Cpu size={28}/>}
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Authoritative Registry Hub</h2>
               <p className="text-[9px] text-emerald-800 font-black uppercase tracking-widest mt-0.5 italic">Sort Protocol: Recently Synchronized First</p>
               <div className="flex items-center gap-2 mt-1">
                  <Activity size={12} className={isIngesting ? 'text-amber-500' : 'text-emerald-500'} />
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                     {isIngesting ? 'Cluster Synchronization in Progress' : 'System State: Optimal & Compliant'}
                  </p>
               </div>
            </div>
         </div>
         <div className="flex bg-slate-50 p-1 rounded-2xl border w-full sm:w-auto relative z-10">
            <button onClick={() => setActiveTab('hub')} className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'hub' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-400'}`}>Update Protocol</button>
            <button onClick={() => setActiveTab('audit')} className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-400'}`}>Ingestion Logs</button>
         </div>
      </div>

      {activeTab === 'hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Official Feeds Card */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
             <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Globe size={24}/></div>
                   <div>
                      <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Authoritative Portals</h3>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Continuous Monitoring & Updates</p>
                   </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700">
                   <Zap size={14} className="animate-pulse" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Live Sync Enabled</span>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[
                 { name: 'UN Security Council', url: OFFICIAL_UN_XML_URL, info: 'Consolidated Global List', icon: <Binary className="text-blue-500"/>, color: 'hover:border-blue-200' },
                 { name: 'Qatar NCTC Portal', url: QATAR_NCTC_PORTAL_URL, info: 'Unified National Sanctions', icon: <ShieldCheck className="text-amber-500"/>, color: 'hover:border-amber-200' },
                 { name: 'OpenSanctions', url: OPENSANCTIONS_URL, info: 'Global Intelligence Dataset', icon: <Database className="text-indigo-500"/>, color: 'hover:border-indigo-200' }
               ].map(s => (
                 <div key={s.name} className={`p-6 bg-slate-50 border border-transparent ${s.color} hover:bg-white rounded-3xl transition-all group flex flex-col justify-between min-h-[160px]`}>
                    <div className="flex justify-between items-start">
                       <div className="p-2.5 bg-white rounded-xl shadow-sm">{s.icon}</div>
                       <a href={s.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-300 hover:text-emerald-800 transition-colors"><ExternalLink size={14}/></a>
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-900 uppercase">{s.name}</p>
                       <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 mb-4">{s.info}</p>
                       <button 
                         onClick={() => handleFetch(s.url, s.name)} 
                         disabled={isIngesting} 
                         className="w-full py-3 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-950 hover:bg-emerald-950 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-30"
                       >
                         {status === 'WORKING' && pendingSource === s.name ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                         Initialize Refresh
                       </button>
                    </div>
                 </div>
               ))}
               
               <div className="p-6 bg-emerald-950 rounded-3xl flex flex-col justify-center items-center text-center space-y-4">
                  <div className="p-3 bg-white/10 rounded-full text-emerald-400"><Zap size={24} className="animate-bounce"/></div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-white tracking-widest">Scheduled Automated Sync</p>
                     <p className="text-[8px] text-emerald-400/60 font-bold uppercase mt-1 tracking-tighter leading-relaxed">Daily Cluster Update Protocol active at 08:00 AM AST</p>
                  </div>
               </div>
             </div>
          </div>

          {/* Manual Deployment Card */}
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Upload size={140} />
             </div>
             
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                   <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Layers size={20}/></div>
                   <div>
                      <h3 className="text-sm font-black uppercase tracking-wider">Manual Ingestion</h3>
                      <p className="text-[9px] text-emerald-400/60 font-black uppercase tracking-widest mt-1">Direct State Injection</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".xml,.csv,.xlsx,.xls,.json"
                   />
                   <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-center space-y-6">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/5">
                         <FileCode size={32} className="text-emerald-400" />
                      </div>
                      <p className="text-[10px] font-bold text-white/40 uppercase leading-relaxed text-center">Deploy XML, CSV, or XLSX Regulatory Bundle</p>
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isIngesting}
                        className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] shadow-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                         <Upload size={20} /> Deploy Data Bundle
                      </button>
                   </div>
                </div>

                {isIngesting && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 bg-white/5 p-6 rounded-2xl border border-white/5">
                     <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                        <span className="text-emerald-400 flex items-center gap-2">
                           <Loader2 size={12} className="animate-spin" /> 
                           {status === 'PURGING' ? 'Purging Stale State...' : (uploadProgress <= 5 ? 'Negotiating Transport...' : 'Ingesting Entities...')}
                        </span>
                        <span>{uploadProgress}%</span>
                     </div>
                     <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-300 ${status === 'PURGING' ? 'animate-pulse' : ''}`} style={{width: `${uploadProgress}%`}}/>
                     </div>
                  </div>
                )}
             </div>

             {status === 'SUCCESS' && (
               <div className="mt-8 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in zoom-in-95 relative z-10">
                  <CheckCircle2 size={24} />
                  <div className="min-w-0">
                     <p className="text-[10px] font-black uppercase tracking-widest">Update Protocol Success</p>
                     <p className="text-[8px] font-bold uppercase opacity-60 mt-0.5">
                       {ingestionCount.toLocaleString()} provisioned. Integrity protocol scrubbed duplicates.
                     </p>
                  </div>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Audit & Logs View */}
      {activeTab === 'audit' && (
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 animate-in fade-in">
           <div className="flex items-center justify-between border-b border-gray-50 pb-6">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><History size={24}/></div>
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Governance Audit Trail</h3>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Global Cluster Event History</p>
                 </div>
              </div>
              <button onClick={refreshLogs} className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-800 rounded-xl transition-all">
                 <RefreshCw size={20} />
              </button>
           </div>

           <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                       <th className="px-6 py-4">Execution Time</th>
                       <th className="px-6 py-4">Source Hub</th>
                       <th className="px-6 py-4">Protocol</th>
                       <th className="px-6 py-4">Yield</th>
                       <th className="px-6 py-4 text-right">Trigger</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {ingestionHistory.map(log => (
                       <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4">
                             <span className="text-xs font-black text-slate-900 uppercase">{log.source}</span>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${log.method === 'Automated' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                {log.method}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-black text-emerald-700">{log.recordsProcessed.toLocaleString()} Entities</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="text-[10px] font-black text-slate-400 uppercase">{log.triggeredBy}</span>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Mapping Engine Modal */}
      {status === 'MAPPING' && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="bg-emerald-950 p-8 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl text-emerald-400"><Settings2 size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black uppercase">Alignment Advisory</h3>
                       <p className="text-[9px] text-emerald-400/60 font-black uppercase tracking-widest mt-1">Bundle: {pendingSource}</p>
                    </div>
                 </div>
                 <button onClick={() => setStatus('IDLE')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-gray-50/30">
                 <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex gap-4 text-blue-800">
                    <Info size={24} className="shrink-0" />
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest">Protocol Alignment</p>
                       <p className="text-xs font-bold leading-relaxed">Map your local file headers to the Authoritative Registry schema. Missing fields will be ignored.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-6">
                    {REQUIRED_SYSTEM_FIELDS.map(sf => (
                       <div key={sf.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sf.label}</p>
                             <p className="text-[8px] font-black text-emerald-600 uppercase">System Key: {sf.key}</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <ArrowRight className="text-gray-200 hidden sm:block" size={18} />
                             <select 
                               className="bg-gray-50 border-2 border-transparent focus:border-emerald-800 focus:bg-white rounded-xl px-4 py-3 text-xs font-black uppercase outline-none min-w-[220px]"
                               value={fieldMapping[sf.key] || ''}
                               onChange={(e) => setFieldMapping({...fieldMapping, [sf.key]: e.target.value})}
                             >
                                <option value="">-- Ignore Field --</option>
                                {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                             </select>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 border-t bg-white flex justify-end items-center gap-4 shrink-0">
                 <button onClick={() => setStatus('IDLE')} className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Abort</button>
                 <button 
                   onClick={executeMappedImport}
                   className="px-12 py-4 bg-emerald-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] shadow-xl hover:bg-emerald-900 transition-all flex items-center gap-3"
                 >
                    <ShieldCheck size={18} /> Deploy Ingestion ({pendingData.length})
                 </button>
              </div>
           </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 flex items-start gap-4 animate-in slide-in-from-top-2 relative group">
           <AlertTriangle size={20} className="shrink-0 mt-0.5" />
           <div className="space-y-1 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest">Protocol Fault</p>
              <p className="text-xs font-bold leading-relaxed">
                {errorMessage.includes('security policy') 
                  ? "Database Shield Active: The master registry's Row-Level Security policy blocked this ingestion. Please ensure the 'sanctions' table has policies allowing insert/update for your current access level."
                  : errorMessage}
              </p>
           </div>
           <button 
             onClick={() => setErrorMessage(null)}
             className="p-2 hover:bg-red-100 rounded-full transition-colors self-center"
           >
             <X size={16} />
           </button>
        </div>
      )}

      {/* Main Registry Data Browser */}
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-white p-4 sm:p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="relative flex-1">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
               <input 
                  type="text" 
                  placeholder="Interrogate Master Registry Identity..." 
                  className="w-full pl-16 pr-6 py-5 bg-gray-50/50 rounded-2xl border-2 border-transparent focus:border-emerald-800 focus:bg-white outline-none text-sm font-black uppercase transition-all" 
                  value={searchTerm} 
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
               />
               {isSearching && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-emerald-800" size={18}/>}
            </div>
            <div className="px-8 py-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center min-w-[200px]">
               <div className="flex items-center gap-2 mb-1">
                  <Database size={12} className="text-emerald-700" />
                  <span className="text-[8px] font-black text-emerald-800 uppercase tracking-widest">Master Identity Tally</span>
               </div>
               <span className="text-base font-black text-emerald-950">{totalInDb.toLocaleString()}</span>
            </div>
         </div>

         <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                 <thead className="bg-gray-50 border-b">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <th className="px-10 py-6">Identity Profile</th>
                       <th className="px-10 py-6">Reference No</th>
                       <th className="px-10 py-6">Jurisdiction</th>
                       <th className="px-10 py-6 text-right">Source Protocol</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {sanctions.length > 0 ? (
                       sanctions.map(s => (
                          <tr key={s.dataId} className="hover:bg-emerald-50/30 transition-colors group">
                             <td className="px-10 py-5">
                                <div className="text-sm font-black text-slate-900 uppercase group-hover:text-emerald-900 transition-colors">
                                   {[s.firstName, s.lastName].filter(Boolean).join(' ')}
                                </div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Identity Hash: {s.dataId}</div>
                             </td>
                             <td className="px-10 py-5">
                                <div className="flex items-center gap-2">
                                   <FileCode size={14} className="text-gray-300" />
                                   <span className="text-[10px] font-black text-slate-500 uppercase">{s.referenceNumber || 'INTERNAL-REF'}</span>
                                </div>
                             </td>
                             <td className="px-10 py-5">
                                <div className="flex items-center gap-2">
                                   <MapPin size={14} className="text-gray-300" />
                                   <span className="text-[10px] font-black text-slate-500 uppercase">{s.nationality || 'UNKNOWN'}</span>
                                </div>
                             </td>
                             <td className="px-10 py-5 text-right">
                                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${
                                  s.source.includes('UN') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                  s.source.includes('Qatar') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                   {s.source}
                                </span>
                             </td>
                          </tr>
                       ))
                    ) : (
                       <tr>
                          <td colSpan={4} className="py-24 text-center">
                             {isSearching ? (
                               <div className="flex flex-col items-center gap-4">
                                  <Loader2 className="animate-spin text-emerald-800" size={40} />
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Handshake Active...</p>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center gap-4 opacity-30">
                                  <Search size={48} className="text-gray-300" />
                                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Registry Hub Clear</p>
                               </div>
                             )}
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
            </div>
            
            {totalMatches > ITEMS_PER_PAGE && (
              <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Showing <span className="text-emerald-900">{sanctions.length}</span> of {totalMatches.toLocaleString()} identities
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-emerald-50 shadow-sm transition-all disabled:opacity-30"><ChevronLeft size={18} /></button>
                    <div className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-emerald-950 uppercase tracking-widest shadow-sm">Page {currentPage} of {Math.ceil(totalMatches / ITEMS_PER_PAGE)}</div>
                    <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalMatches / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(totalMatches / ITEMS_PER_PAGE)} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-emerald-50 shadow-sm transition-all disabled:opacity-30"><ChevronRight size={18} /></button>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SanctionsRegistry;
