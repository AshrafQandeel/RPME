
import React, { useState, useEffect } from 'react';
import { SystemLog, AppSettings } from '../types';
import { Save, Cloud, Terminal, Check, Copy, AlertTriangle, Wifi, WifiOff, Loader2, Link as LinkIcon, Share2 } from 'lucide-react';
import { checkConnection } from '../services/cloudDb';

interface AdminPanelProps {
  logs: SystemLog[];
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  settings, 
  onUpdateSettings, 
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CHECKING' | 'CONNECTED' | 'FAILED'>('IDLE');

  useEffect(() => { 
    setLocalSettings(settings); 
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    setSaveMessage("Settings saved successfully.");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const testConnection = async () => {
    setConnectionStatus('CHECKING');
    const isOk = await checkConnection();
    setConnectionStatus(isOk ? 'CONNECTED' : 'FAILED');
  };

  const generateSetupLink = () => {
    const config = {
      url: localSettings.supabaseUrl,
      key: localSettings.supabaseKey
    };
    const base64 = btoa(JSON.stringify(config));
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}#/admin?setup=${base64}`;
    
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const sqlScript = `-- SQL setup script remains version 1.9...`.trim();

  const copySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">System Administration</h2>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-sm text-green-600 font-medium animate-pulse">{saveMessage}</span>}
          <button onClick={handleSave} disabled={!hasChanges} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${hasChanges ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
            <Save size={18} /> {hasChanges ? 'Apply Settings' : 'Settings Up to Date'}
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Cloud size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Cloud Database Sync (Supabase)</h3>
              <p className="text-sm text-gray-500">Configure your backend to enable multi-device synchronization.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={generateSetupLink}
              disabled={!localSettings.supabaseUrl || !localSettings.supabaseKey}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                copiedLink ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
              {copiedLink ? 'Link Copied!' : 'Share Setup Link'}
            </button>
            <button 
              onClick={testConnection}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                connectionStatus === 'CONNECTED' ? 'bg-green-100 text-green-700 border border-green-200' :
                connectionStatus === 'FAILED' ? 'bg-red-100 text-red-700 border border-red-200' :
                'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {connectionStatus === 'CHECKING' ? <Loader2 size={14} className="animate-spin" /> : 
               connectionStatus === 'CONNECTED' ? <Wifi size={14} /> : 
               connectionStatus === 'FAILED' ? <WifiOff size={14} /> : <Wifi size={14} />}
              {connectionStatus === 'CHECKING' ? 'Verifying...' : 
               connectionStatus === 'CONNECTED' ? 'Successfully Linked' : 
               connectionStatus === 'FAILED' ? 'Link Failed - Check Settings' : 'Test Connection'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Supabase URL</label>
            <input className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" value={localSettings.supabaseUrl || ''} placeholder="https://xyz.supabase.co" onChange={e => handleChange('supabaseUrl', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">API Key (Service Role or Anon)</label>
            <input className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" type="password" value={localSettings.supabaseKey || ''} placeholder="eyJhbG..." onChange={e => handleChange('supabaseKey', e.target.value)} />
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-2xl overflow-hidden">
           <div className="bg-slate-800 px-6 py-3 flex justify-between items-center">
              <span className="text-slate-300 text-sm font-bold flex items-center gap-2"><Terminal size={16} /> SQL Setup Script</span>
              <button onClick={copySql} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all">
                {copiedSql ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                {copiedSql ? 'Copied!' : 'Copy SQL'}
              </button>
           </div>
           <div className="p-6">
              <div className="bg-amber-900/20 border border-amber-900/30 p-3 rounded-xl mb-4">
                 <p className="text-xs text-amber-200 flex items-center gap-2">
                   <AlertTriangle size={14}/> 
                   Important: Ensure you click "Apply Settings" above after updating your URL and Key, or the Cloud connection will not activate.
                 </p>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                <span className="font-bold text-slate-300">Tip:</span> Use the "Share Setup Link" button above to generate a URL you can send to other authorized devices to sync them instantly.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
