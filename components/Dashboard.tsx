import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, AlertTriangle, Globe, CheckCircle } from 'lucide-react';
import { Client, RiskLevel } from '../types';

interface DashboardProps {
  clients: Client[];
  sanctionsCount: number;
}

const Dashboard: React.FC<DashboardProps> = ({ clients, sanctionsCount }) => {
  const highRisk = clients.filter(c => c.riskLevel === RiskLevel.HIGH).length;
  const mediumRisk = clients.filter(c => c.riskLevel === RiskLevel.MEDIUM).length;
  const lowRisk = clients.filter(c => c.riskLevel === RiskLevel.LOW).length;
  const clean = clients.filter(c => c.riskLevel === RiskLevel.NONE).length;

  const riskData = [
    { name: 'High Risk', value: highRisk, color: '#EF4444' },
    { name: 'Medium Risk', value: mediumRisk, color: '#F59E0B' },
    { name: 'Low Risk', value: lowRisk, color: '#3B82F6' },
    { name: 'No Match', value: clean, color: '#10B981' },
  ];

  const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} text-white`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Clients" 
          value={clients.length} 
          icon={<Users size={24} />} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Active Sanctions" 
          value={sanctionsCount.toLocaleString()} 
          icon={<Globe size={24} />} 
          color="bg-indigo-600" 
        />
        <StatCard 
          title="High Risk Alerts" 
          value={highRisk} 
          icon={<AlertTriangle size={24} />} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Clean Records" 
          value={clean} 
          icon={<CheckCircle size={24} />} 
          color="bg-emerald-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Mock */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent System Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
             {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                 <div className="h-2 w-2 mt-2 rounded-full bg-blue-400 flex-shrink-0" />
                 <div>
                   <p className="text-sm font-medium text-gray-900">
                     {i === 1 ? 'System update completed' : i === 2 ? 'New client added: John Doe' : 'Screening batch processed'}
                   </p>
                   <p className="text-xs text-gray-500">
                     {i === 1 ? 'Just now' : `${i * 10} minutes ago`}
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