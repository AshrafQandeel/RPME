import React from 'react';
import { SystemLog } from '../types';
import { FileDown, ShieldCheck, Clock } from 'lucide-react';

interface AdminPanelProps {
  logs: SystemLog[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Administration</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><ShieldCheck size={20} className="text-green-500"/> Data Retention</h3>
          <p className="text-sm text-gray-600 mb-4">Audit logs are retained for 7 years as per AML policy.</p>
          <div className="text-xs text-gray-400">Current storage: 45MB / 5GB</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Clock size={20} className="text-blue-500"/> Scheduler</h3>
          <p className="text-sm text-gray-600 mb-4">Auto-sync configured for 00:00 UTC daily.</p>
          <button className="text-blue-600 text-sm font-medium hover:underline">Configure Schedule</button>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><FileDown size={20} className="text-indigo-500"/> Export</h3>
          <p className="text-sm text-gray-600 mb-4">Download full system state for backup.</p>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm transition-colors">Export DB</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">System Audit Logs</h3>
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