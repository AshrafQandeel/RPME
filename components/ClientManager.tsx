import React, { useState } from 'react';
import { Client, EntityType, RiskLevel } from '../types';
import { Plus, Search, Filter, Trash2, Edit, RefreshCw } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => void;
  onDeleteClient: (id: string) => void;
  onRefresh?: () => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onDeleteClient, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nationality: '',
    dob: '',
    passportNumber: '',
    type: EntityType.INDIVIDUAL,
    residenceCountry: '',
    remarks: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddClient(formData);
    setIsModalOpen(false);
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      nationality: '',
      dob: '',
      passportNumber: '',
      type: EntityType.INDIVIDUAL,
      residenceCountry: '',
      remarks: ''
    });
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredClients = clients.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nationality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.HIGH: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">High Risk</span>;
      case RiskLevel.MEDIUM: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Medium</span>;
      case RiskLevel.LOW: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Low</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Clean</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Client Management</h2>
        <div className="flex gap-2">
          {onRefresh && (
            <button 
              onClick={handleRefresh}
              className={`flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors shadow-sm ${isRefreshing ? 'opacity-70' : ''}`}
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add New Client
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, nationality..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
          <Filter size={18} />
          Filter
        </button>
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nationality</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Screened</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{client.firstName} {client.lastName}</div>
                  {client.passportNumber && <div className="text-xs text-gray-500">ID: {client.passportNumber}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{client.nationality}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{client.type}</td>
                <td className="px-6 py-4">{getRiskBadge(client.riskLevel)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{client.lastScreenedAt ? new Date(client.lastScreenedAt).toLocaleDateString() : 'Never'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit size={16} /></button>
                    <button onClick={() => onDeleteClient(client.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No clients found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Add New Client</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input required className="w-full border rounded-lg p-2" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input className="w-full border rounded-lg p-2" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input required className="w-full border rounded-lg p-2" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality *</label>
                  <input required className="w-full border rounded-lg p-2" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" className="w-full border rounded-lg p-2" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passport / ID</label>
                  <input className="w-full border rounded-lg p-2" value={formData.passportNumber} onChange={e => setFormData({...formData, passportNumber: e.target.value})} />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Residence Country</label>
                  <input className="w-full border rounded-lg p-2" value={formData.residenceCountry} onChange={e => setFormData({...formData, residenceCountry: e.target.value})} />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                  <select className="w-full border rounded-lg p-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as EntityType})}>
                    <option value={EntityType.INDIVIDUAL}>Individual</option>
                    <option value={EntityType.ENTITY}>Organization / Entity</option>
                  </select>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea className="w-full border rounded-lg p-2" rows={3} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;