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
  const [copiedSql, setCopiedSql] = useState(false);

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

  const sqlScript = `
-- UNSanctionGuard KYC Schema v1.4
-- Run this in your Supabase SQL Editor

DROP TABLE IF EXISTS clients;

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL, -- Name as in CR
  cr_number TEXT,
  cr_expiry TEXT,
  entity_card_number TEXT,
  entity_card_expiry TEXT,
  nature_of_business TEXT,
  service_needed TEXT,
  telephone_number TEXT,
  email_address TEXT,
  website TEXT,
  registered_address TEXT,
  
  -- Complex structures stored as JSONB
  shareholders JSONB DEFAULT '[]',
  ubos JSONB DEFAULT '[]',
  signatories JSONB DEFAULT '[]',
  documents JSONB DEFAULT '{}',
  matches JSONB DEFAULT '[]',
  
  is_pep BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'Entity',
  created_at TEXT,
  last_screened_at TEXT,
  risk_level TEXT,
  match_id TEXT
);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE clients;

-- Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON clients FOR ALL USING (true) WITH CHECK (true);
  `.trim();

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
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Cloud size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Cloud Database Sync (Supabase)</h3>
            <p className="text-sm text-gray-500">Configure your backend to enable multi-device synchronization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Supabase Project URL</label>
            <input className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://xyz.supabase.co" value={localSettings.supabaseUrl || ''} onChange={e => handleChange('supabaseUrl', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Anon API Key</label>
            <input className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" type="password" placeholder="Paste your service key here..." value={localSettings.supabaseKey || ''} onChange={e => handleChange('supabaseKey', e.target.value)} />
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-2xl overflow-hidden">
           <div className="bg-slate-800 px-6 py-3 flex justify-between items-center">
              <span className="text-slate-300 text-sm font-bold flex items-center gap-2">
                <Terminal size={16} className="text-blue-400"/> SQL Setup Script (v1.4 - Required)
              </span>
              <button onClick={copySql} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                {copiedSql ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                {copiedSql ? 'Copied!' : 'Copy SQL'}
              </button>
           </div>
           <div className="p-6">
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                Copy and paste the script below into the <span className="text-blue-400 font-bold italic">SQL Editor</span> of your Supabase project to create the necessary table structure for the new KYC onboarding fields.
              </p>
              <pre className="text-blue-300 text-[11px] font-mono leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
                {sqlScript}
              </pre>
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
          <Globe size={20} className="text-indigo-500"/> Compliance Policy Configuration
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <span className="block font-bold text-gray-800">Mandatory Document Enforcement</span>
              <span className="text-xs text-gray-500">Require all 9 onboarding documents before finalizing the client.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-50">
             <div>
              <span className="block font-bold text-gray-800">QID Validation (API)</span>
              <span className="text-xs text-gray-500">Validate Qatar ID numbers against MOI database (Requires Enterprise API).</span>
            </div>
            <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded">UPCOMING</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;