import React, { useState, useRef, useEffect } from 'react';
import { SystemLog, AppSettings } from '../types';
import { FileDown, ShieldCheck, RefreshCw, Save, Globe, Database, Upload, Download, AlertCircle, Cloud, Terminal, Check, Smartphone, Copy } from 'lucide-react';

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
  logs, 
  settings, 
  onUpdateSettings, 
  onTriggerSync, 
  isSyncing,
  onExportData,
  onImportData
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => { if (!hasChanges) setLocalSettings(settings); }, [settings, hasChanges]);

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

  const getMagicLink = () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) return '';
    const config = { supabaseUrl: settings.supabaseUrl, supabaseKey: settings.supabaseKey };
    const encoded = btoa(JSON.stringify(config));
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    return `${baseUrl}?config=${encoded}`;
  };

  const sqlScript = `
-- v1.3.0 KYC Schema Update
drop table if exists clients;

create table clients (
  id text primary key,
  first_name text not null, -- Name as in CR
  cr_number text,
  cr_expiry text,
  entity_card_number text,
  entity_card_expiry text,
  nature_of_business text,
  service_needed text,
  telephone_number text,
  email_address text,
  website text,
  registered_address text,
  shareholders jsonb,
  ubos jsonb,
  signatories jsonb,
  documents jsonb,
  is_pep boolean default false,
  type text,
  created_at text,
  last_screened_at text,
  risk_level text,
  match_id text,
  matches jsonb
);

alter table clients enable row level security;
create policy "Public Access" on clients for all using (true) with check (true);
  `.trim();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">System Administration</h2>
        <button onClick={handleSave} disabled={!hasChanges} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${hasChanges ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
          <Save size={18} /> {hasChanges ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-blue-500">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Cloud size={20} className="text-blue-500"/> Supabase Cloud Integration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input className="border p-2 rounded text-sm font-mono" placeholder="Project URL" value={localSettings.supabaseUrl || ''} onChange={e => handleChange('supabaseUrl', e.target.value)} />
          <input className="border p-2 rounded text-sm font-mono" type="password" placeholder="Anon Key" value={localSettings.supabaseKey || ''} onChange={e => handleChange('supabaseKey', e.target.value)} />
        </div>
        
        <div className="bg-slate-50 p-4 rounded-lg">
           <button onClick={() => setShowSql(!showSql)} className="text-sm font-medium flex items-center gap-2 text-slate-700">
             <Terminal size={16}/> Show Table SQL (KYC Schema v1.3)
           </button>
           {showSql && <pre className="mt-3 bg-slate-900 text-slate-50 p-3 rounded text-xs overflow-x-auto font-mono">{sqlScript}</pre>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Globe size={20} className="text-indigo-500"/> Onboarding Compliance Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="block text-sm font-medium">Strict Document Verification</span>
              <span className="text-xs text-gray-500">Block onboarding if mandatory docs are not uploaded</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;