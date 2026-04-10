
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, Globe, CheckCircle, Clock, ShieldCheck, Activity, CloudUpload, RefreshCw, Beaker, Loader2 } from 'lucide-react';
import { Client, RiskLevel, SystemEnvironment } from '../types';

interface DashboardProps {
  clients: Client[];
  totalClientsCount: number;
  sanctionsCount: number;
  registryStats?: {
    lastFetch: string;
    lastTest: string;
    lastSourceUpdate?: string;
    syncProgress?: number;
    currentSyncSource?: string;
  };
  isGlobalSyncing?: boolean;
  environment?: SystemEnvironment;
  riskSummary?: Record<RiskLevel, number>; // Authoritative Registry Counts
}

const Dashboard: React.FC<DashboardProps> = ({ clients, totalClientsCount, sanctionsCount, registryStats, isGlobalSyncing, environment, riskSummary }) => {
  const isProd = environment === SystemEnvironment.PRODUCTION;
  
  const highRisk = riskSummary ? riskSummary[RiskLevel.HIGH] : clients.filter(c => c.riskLevel === RiskLevel.HIGH).length;
  const mediumRisk = riskSummary ? riskSummary[RiskLevel.MEDIUM] : clients.filter(c => c.riskLevel === RiskLevel.MEDIUM).length;
  const lowRisk = riskSummary ? riskSummary[RiskLevel.LOW] : clients.filter(c => c.riskLevel === RiskLevel.LOW).length;
  const clean = riskSummary ? riskSummary[RiskLevel.NONE] : clients.filter(c => c.riskLevel === RiskLevel.NONE).length;

  const riskData = [
    { name: 'High Risk', value: highRisk, color: '#EF4444' },
    { name: 'Medium Risk', value: mediumRisk, color: '#F59E0B' },
    { name: 'Low Risk', value: lowRisk, color: '#3B82F6' },
    { name: 'Clear', value: clean, color: '#10B981' },
  ];

  const StatCard = ({ title, value, icon, color, subValue, highlight = false }: any) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border ${highlight ? (isProd ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-amber-500 ring-4 ring-amber-500/5') : 'border-gray-100'} flex flex-col justify-between transition-transform hover:scale-[1.02] relative overflow-hidden`}>
      {highlight && (
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <Activity size={40} className={`${isProd ? 'text-emerald-500' : 'text-amber-500'} animate-pulse`} />
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{title}</p>
          <h3 className="text-2xl font-black text-emerald-950">{value.toLocaleString()}</h3>
        </div>
        <div className={`p-4 rounded-xl ${!isProd && highlight ? 'bg-amber-600' : color} text-white shadow-lg`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
      </div>
      {subValue && (
        <div className="pt-3 border-t border-gray-50 mt-2">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-1.5 truncate">
             <Clock size={10} className={highlight ? (isProd ? 'text-emerald-500' : 'text-amber-500') : ''}/>
             {subValue}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Registry Pulse Header */}
      <div className={`p-8 rounded-[2.5rem] text-white flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${!isProd ? 'bg-slate-900 border-b-4 border-amber-500' : isGlobalSyncing ? 'bg-indigo-950' : 'bg-emerald-950'}`}>
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Activity size={140} />
        </div>
        
        {isGlobalSyncing && (
           <div className="absolute top-0 left-0 w-full h-1 bg-white/20 overflow-hidden">
              <div 
                className="h-full bg-blue-400 transition-all duration-500" 
                style={{ width: `${registryStats?.syncProgress || 0}%` }}
              />
           </div>
        )}

        <div className="relative z-10 w-full xl:w-1/2">
          <div className="flex items-center gap-3 mb-2">
            {!isProd ? (
                <div className="bg-amber-500 p-2 rounded-xl text-slate-950 animate-bounce">
                    <Beaker size={24} />
                </div>
            ) : isGlobalSyncing ? (
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <RefreshCw size={24} className="text-blue-300 animate-spin" />
                </div>
            ) : (
                <Globe size={28} className="text-emerald-400" />
            )}
            <h2 className="text-2xl font-black uppercase tracking-tight">
              {!isProd ? 'Sandbox Simulation Active' : isGlobalSyncing ? 'Syncing Authoritative Data' : 'System Registry Pulse'}
            </h2>
          </div>
          <p className={`${!isProd ? 'text-amber-400' : isGlobalSyncing ? 'text-blue-300' : 'text-emerald-400/60'} text-[10px] font-black uppercase tracking-[0.3em]`}>
            {!isProd ? 'Read-only node: Data persistence to master registry is suspended.' : isGlobalSyncing ? `Updating: ${registryStats?.currentSyncSource || 'Cloud Registry'} (${registryStats?.syncProgress || 0}%)` : 'Live Continuous Compliance Monitoring'}
          </p>
          
          {isGlobalSyncing && (
            <div className="mt-4 space-y-2">
               <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-blue-200/60">
                  <span>Batch Ingestion Progress</span>
                  <span>{registryStats?.syncProgress || 0}%</span>
               </div>
               <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)] transition-all duration-500" 
                    style={{ width: `${registryStats?.syncProgress || 0}%` }}
                  />
               </div>
            </div>
          )}
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-4 w-full xl:w-auto">
          <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex flex-col min-w-[180px]">
             <div className="flex items-center gap-2 mb-1.5">
                <CloudUpload size={12} className="text-blue-400" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Master Cloud Sync</p>
             </div>
             <p className="text-[11px] font-black text-white uppercase">{isGlobalSyncing ? 'SYNCING...' : (registryStats?.lastSourceUpdate || 'Never')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex flex-col min-w-[180px]">
             <div className="flex items-center gap-2 mb-1.5">
                <Clock size={12} className="text-amber-400" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Local Refresh</p>
             </div>
             <p className="text-[11px] font-black text-white uppercase">{registryStats?.lastFetch || 'Never'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Sanctioned Identities" 
          value={sanctionsCount} 
          icon={<Globe />} 
          color="bg-emerald-600" 
          highlight={true}
          subValue={registryStats?.lastSourceUpdate ? `Last Sync: ${registryStats.lastSourceUpdate}` : 'Awaiting Connection'}
        />
        <StatCard 
          title="Total Clients" 
          value={totalClientsCount} 
          icon={<Users />} 
          color="bg-blue-600" 
          subValue="Active Master Registry"
        />
        <StatCard 
          title="High Risk Hits" 
          value={highRisk} 
          icon={<AlertTriangle />} 
          color="bg-red-500" 
          subValue="Authoritative Registry Count"
        />
        <StatCard 
          title="Clean Profiles" 
          value={clean} 
          icon={<CheckCircle />} 
          color="bg-emerald-500" 
          subValue="Authoritative Registry Tally"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-6">Master Risk Distribution (Registry Global)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-6">Recent System Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px] custom-scrollbar">
             {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="flex gap-4 items-start p-4 hover:bg-emerald-50/30 rounded-2xl transition-all border border-transparent hover:border-emerald-100">
                 <div className={`h-2 w-2 mt-2 rounded-full ${i === 1 && isGlobalSyncing ? 'bg-blue-500 animate-ping' : i === 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                 <div className="min-w-0">
                   <p className="text-xs font-bold text-emerald-950 truncate">
                     {!isProd && i === 1 ? 'Sandbox Dry Run Execution - Master persistence bypassed' : 
                      i === 1 && isGlobalSyncing ? `Distributed Sync In Progress - Updating ${registryStats?.currentSyncSource}` : 
                      i === 1 ? `Master Registry Synchronized successfully at ${registryStats?.lastSourceUpdate}` : 
                      i === 2 ? 'Global fuzzy screening pass initialized' : 
                      'Entity onboarding protocol active'}
                   </p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">
                     {i === 1 ? 'Current Event' : `${i * 15}m ago`} • Node Status: Normal
                   </p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
