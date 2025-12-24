
import React, { useState, useRef, useEffect } from 'react';
import { SystemLog, AppSettings } from '../types';
import { Save, Cloud, Terminal, Check, Copy } from 'lucide-react';

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
-- UNSanctionGuard Corporate KYC Schema v1.6
-- Run this in your Supabase SQL Editor

DROP TABLE IF EXISTS clients;

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  no TEXT,
  status TEXT,
  qfc_no TEXT,
  legal_structure TEXT,
  corporate_nationality TEXT,
  first_name TEXT NOT NULL, -- Client Name
  company_type TEXT,
  services_needed TEXT,
  engagement_year TEXT,
  engagement_date TEXT,
  onboarding_date TEXT,
  incorporation_date TEXT, -- Date of QFC Incorporation or Registration
  
  cr_expiry_date TEXT, -- CR Expired date
  entity_card_no TEXT,
  entity_card_expiry TEXT,
  license TEXT,
  license_expiry TEXT,
  approved_auditor TEXT,
  
  nature_of_business TEXT,
  registered_address TEXT,
  telephone_number TEXT,
  email_address TEXT,
  website TEXT,
  
  directors JSONB DEFAULT '[]',
  shareholders JSONB DEFAULT '[]',
  ubos JSONB DEFAULT '[]',
  signatories JSONB DEFAULT '[]',
  
  secretary TEXT,
  senior_executive_function TEXT,
  
  is_pep BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'Entity',
  created_at TEXT,
  last_screened_at TEXT,
  risk_level TEXT,
  match_id TEXT,
  matches JSONB DEFAULT '[]',
  documents JSONB DEFAULT '{}'
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clients;

-- RLS
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
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Cloud size={24} /></div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Cloud Database Sync (Supabase)</h3>
            <p className="text-sm text-gray-500">Configure your backend to enable multi-device synchronization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Supabase URL</label>
            <input className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono" value={localSettings.supabaseUrl || ''} onChange={e => handleChange('supabaseUrl', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label>
            <input className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono" type="password" value={localSettings.supabaseKey || ''} onChange={e => handleChange('supabaseKey', e.target.value)} />
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-2xl overflow-hidden">
           <div className="bg-slate-800 px-6 py-3 flex justify-between items-center">
              <span className="text-slate-300 text-sm font-bold flex items-center gap-2"><Terminal size={16} /> SQL Setup Script (v1.6)</span>
              <button onClick={copySql} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all">
                {copiedSql ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                {copiedSql ? 'Copied!' : 'Copy SQL'}
              </button>
           </div>
           <div className="p-6">
              <pre className="text-blue-300 text-[10px] font-mono leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
                {sqlScript}
              </pre>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
