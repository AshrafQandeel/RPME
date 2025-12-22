import React, { useState } from 'react';
import { Client, EntityType, RiskLevel, KYCIndividual } from '../types';
import { Plus, Search, Filter, Trash2, Edit, RefreshCw, Building2, UserPlus, ShieldCheck, FileText, Upload, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

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
  
  const initialPerson: KYCIndividual = { name: '', nationality: '', dob: '', qidNumber: '', qidExpiry: '' };

  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt' | 'riskLevel'>>({
    firstName: '',
    crNumber: '',
    crExpiry: '',
    entityCardNumber: '',
    entityCardExpiry: '',
    natureOfBusiness: '',
    serviceNeeded: '',
    telephoneNumber: '',
    emailAddress: '',
    website: '',
    registeredAddress: '',
    shareholders: [{ ...initialPerson, ownershipPercentage: 0 }],
    ubos: [{ ...initialPerson }],
    signatories: [{ ...initialPerson, authority: '' }],
    isPep: false,
    type: EntityType.ENTITY,
    documents: {
      cr: false, entityCard: false, tradeLicense: false, aoa: false, financials: false,
      uboInfo: false, shareholderIds: false, signatoryIds: false, parentCr: false
    }
  });

  const handleAddPerson = (type: 'shareholders' | 'ubos' | 'signatories') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { ...initialPerson, ...(type === 'shareholders' ? { ownershipPercentage: 0 } : {}), ...(type === 'signatories' ? { authority: '' } : {}) }]
    }));
  };

  const handleRemovePerson = (type: 'shareholders' | 'ubos' | 'signatories', index: number) => {
    if (formData[type].length <= 1) return;
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handlePersonChange = (type: 'shareholders' | 'ubos' | 'signatories', index: number, field: keyof KYCIndividual, value: any) => {
    const updated = [...formData[type]];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, [type]: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddClient(formData);
    setIsModalOpen(false);
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.HIGH: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1"><AlertCircle size={12}/> High Risk</span>;
      case RiskLevel.MEDIUM: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Medium</span>;
      case RiskLevel.LOW: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Low</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Clean</span>;
    }
  };

  const filteredClients = clients.filter(c => 
    c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.crNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">KYC Onboarding & Client Management</h2>
        <div className="flex gap-2">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={18} />
            Start Onboarding
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Company Name or CR Number..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Entity Name</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">CR Details</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">AML Status</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Registered Address</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{client.firstName}</div>
                  <div className="text-xs text-gray-500">{client.natureOfBusiness}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-700">CR: {client.crNumber}</div>
                  <div className="text-xs text-gray-400 font-mono">Exp: {client.crExpiry}</div>
                </td>
                <td className="px-6 py-4">{getRiskBadge(client.riskLevel)}</td>
                <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{client.registeredAddress}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="text-gray-400 hover:text-indigo-600 p-1"><Edit size={16} /></button>
                    <button onClick={() => onDeleteClient(client.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No entities found in database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Onboarding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Entity KYC Onboarding</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Compliance Level: High</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Section 1: Company Information */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-700 font-bold border-b pb-2">
                  <Building2 size={18} />
                  <span>1. Company Profile</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name as in CR *</label>
                    <input required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CR Number *</label>
                    <input required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.crNumber} onChange={e => setFormData({...formData, crNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CR Expiry Date *</label>
                    <input type="date" required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.crExpiry} onChange={e => setFormData({...formData, crExpiry: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nature of Business *</label>
                    <input required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.natureOfBusiness} onChange={e => setFormData({...formData, natureOfBusiness: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entity Card Number *</label>
                    <input required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.entityCardNumber} onChange={e => setFormData({...formData, entityCardNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Entity Card Expiry *</label>
                    <input type="date" required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.entityCardExpiry} onChange={e => setFormData({...formData, entityCardExpiry: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Service Needed *</label>
                    <select className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.serviceNeeded} onChange={e => setFormData({...formData, serviceNeeded: e.target.value})}>
                      <option value="">Select Service...</option>
                      <option value="Audit">Audit</option>
                      <option value="Tax Consulting">Tax Consulting</option>
                      <option value="Company Formation">Company Formation</option>
                      <option value="Advisory">Advisory</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email *</label>
                    <input type="email" required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.emailAddress} onChange={e => setFormData({...formData, emailAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Telephone *</label>
                    <input required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.telephoneNumber} onChange={e => setFormData({...formData, telephoneNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Website</label>
                    <input className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Registered Address *</label>
                    <input required className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.registeredAddress} onChange={e => setFormData({...formData, registeredAddress: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* Section 2: Personnel Sections */}
              {[
                { label: 'Shareholders', key: 'shareholders', icon: <UserPlus size={18}/> },
                { label: 'Ultimate Beneficial Owners (UBOs)', key: 'ubos', icon: <ShieldCheck size={18}/> },
                { label: 'Authorized Signatories', key: 'signatories', icon: <FileText size={18}/> }
              ].map((section) => (
                <section key={section.key} className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                      {section.icon}
                      <span>{section.label}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleAddPerson(section.key as any)}
                      className="text-xs flex items-center gap-1 bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 font-semibold"
                    >
                      <Plus size={14} /> Add New
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData[section.key as keyof typeof formData] instanceof Array && (formData[section.key as any] as KYCIndividual[]).map((person, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 relative group">
                        <button 
                          type="button" 
                          onClick={() => handleRemovePerson(section.key as any, index)}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Full Name</label>
                            <input required className="w-full border-gray-100 border rounded p-1.5 text-sm" value={person.name} onChange={e => handlePersonChange(section.key as any, index, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nationality</label>
                            <input required className="w-full border-gray-100 border rounded p-1.5 text-sm" value={person.nationality} onChange={e => handlePersonChange(section.key as any, index, 'nationality', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date of Birth</label>
                            <input type="date" required className="w-full border-gray-100 border rounded p-1.5 text-sm" value={person.dob} onChange={e => handlePersonChange(section.key as any, index, 'dob', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">QID Number</label>
                            <input required className="w-full border-gray-100 border rounded p-1.5 text-sm font-mono" value={person.qidNumber} onChange={e => handlePersonChange(section.key as any, index, 'qidNumber', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">QID Expiry</label>
                            <input type="date" required className="w-full border-gray-100 border rounded p-1.5 text-sm" value={person.qidExpiry} onChange={e => handlePersonChange(section.key as any, index, 'qidExpiry', e.target.value)} />
                          </div>
                          {section.key === 'shareholders' && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ownership %</label>
                              <input type="number" required className="w-full border-gray-100 border rounded p-1.5 text-sm" value={person.ownershipPercentage} onChange={e => handlePersonChange('shareholders', index, 'ownershipPercentage', parseFloat(e.target.value))} />
                            </div>
                          )}
                          {section.key === 'signatories' && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Authority Level</label>
                              <input required className="w-full border-gray-100 border rounded p-1.5 text-sm" placeholder="e.g. Full Power" value={person.authority} onChange={e => handlePersonChange('signatories', index, 'authority', e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* Section 3: Compliance & Documents */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-indigo-700 font-bold border-b pb-2">
                    <ShieldCheck size={18} />
                    <span>3. AML Declarations</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500" checked={formData.isPep} onChange={e => setFormData({...formData, isPep: e.target.checked})} />
                      <div>
                        <span className="font-bold text-amber-900 block">PEP Declaration</span>
                        <span className="text-xs text-amber-700">Check if any of the above listed persons are Politically Exposed Persons (PEPs)</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold border-b pb-2">
                    <FileText size={18} />
                    <span>4. Required Documentation</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.keys(formData.documents).map((docKey) => (
                      <div key={docKey} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600" checked={(formData.documents as any)[docKey]} onChange={e => setFormData({...formData, documents: {...formData.documents, [docKey]: e.target.checked}})} />
                          <span className="text-xs text-gray-700 capitalize">{docKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                        <button type="button" className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity">
                          <Upload size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 py-6 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-bold transition-all transform active:scale-95">Complete Onboarding</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;