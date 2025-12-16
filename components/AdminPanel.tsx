import React, { useState, useRef } from 'react';
import { SystemLog, AppSettings } from '../types';
import { FileDown, ShieldCheck, Clock, RefreshCw, Save, Globe, Database, Upload, Download, AlertCircle } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (window.confirm("WARNING: This will overwrite your current data with the backup file. Are you sure?")) {
        onImportData(e.target.files[0]);
      }
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">System Administration</h2>
        {hasChanges && (
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Save size={18} />
            Save Changes
          </button>
        )}
      </div>

      {/* Data Persistence Warning */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-semibold text-amber-800">Local Storage Mode</h4>
          <p className="text-sm text-amber-700 mt-1">
            This application is currently using browser storage. Data will not automatically sync across different devices or browsers. 
            Use the <strong>Data Portability</strong> section below to move your data manually.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Configuration Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Globe size={20} className="text-indigo-500"/> Sanctions Synchronization
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="block text-sm font-medium text-gray-900">Auto-Sync Enabled</span>
                <span className="text-xs text-gray-500">Automatically update from source URLs</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={localSettings.autoSync}
                  onChange={(e) => handleChange('autoSync', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source URL (UN XML)</label>
              <input 
                type="text" 
                className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-600 font-mono"
                value={localSettings.sourceUrl}
                onChange={(e) => handleChange('sourceUrl', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sync Frequency</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={localSettings.syncIntervalMinutes}
                  onChange={(e) => handleChange('syncIntervalMinutes', parseInt(e.target.value))}
                >
                  <option value={15}>Every 15 Minutes</option>
                  <option value={60}>Hourly</option>
                  <option value={720}>Every 12 Hours</option>
                  <option value={1440}>Daily</option>
                </select>
              </div>
              <div className="flex items-end">
                 <button 
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className={`w-full flex justify-center items-center gap-2 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
                 >
                   <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                   {isSyncing ? 'Syncing...' : 'Sync Now'}
                 </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 flex justify-between">
              <span>Last: {new Date(settings.lastSync).toLocaleString()}</span>
              <span>Next: {new Date(settings.nextSync).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* System Health & Data Portability */}
        <div className="space-y-6">
           {/* Data Portability */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Database size={20} className="text-purple-500"/> Data Portability
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Export your database to transfer it to another browser, or backup your client list.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onExportData}
                className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-200 transition-all group"
              >
                <Download size={24} className="text-gray-400 group-hover:text-purple-600 mb-2"/>
                <span className="text-sm font-medium text-gray-700">Download Backup</span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-200 transition-all group"
              >
                <Upload size={24} className="text-gray-400 group-hover:text-purple-600 mb-2"/>
                <span className="text-sm font-medium text-gray-700">Restore from Backup</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
              </button>
            </div>
           </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><ShieldCheck size={20} className="text-green-500"/> Data Retention</h3>
            <p className="text-sm text-gray-600 mb-1">Audit logs are retained for 7 years as per AML policy.</p>
            <div className="text-xs text-gray-400">Current storage: 45MB / 5GB</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">System Audit Logs</h3>
          <button className="text-sm text-gray-500 flex items-center gap-1 hover:text-indigo-600">
            <FileDown size={14} /> Export Logs
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.slice().reverse().map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-500 font-mono">{log.timestamp.replace('T', ' ').substring(0, 19)}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{log.action}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 
                      log.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;