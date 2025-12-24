import React, { useState } from 'react';
import { Client, EntityType, RiskLevel, KYCDirector, KYCShareholder, KYCUBO, KYCAuthorizedSignatory } from '../types';
import { Plus, Search, Filter, Trash2, Edit, RefreshCw, Building2, UserPlus, ShieldCheck, FileText, Upload, X, Check, Users, Briefcase, Landmark } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => void;
  onDeleteClient: (id: string) => void;
  onRefresh?: () => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onDeleteClient, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialBase: any = { name: '', nationality: '', dob: '', qidOrPassport: '' };

  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt' | 'riskLevel'>>({
    no: '',
    status: 'Pending',
    qfcNo: '',
    legalStructure: '',
    corporateNationality: '',
    firstName: '',
    companyType: '',
    servicesNeeded: '',
    engagementYear: new Date().getFullYear(),
    engagementDate: '',
    onboardingDate: '',
    incorporationDate: '',
    crExpiryDate: '',
    entityCardNo: '',
    entityCardExpiry: '',
    license: '',
    licenseExpiry: '',
    approvedAuditor: '',
    natureOfBusiness: '',
    registeredAddress: '',
    telephoneNumber: '',
    emailAddress: '',
    website: '',
    directors: [{ ...initialBase }],
    shareholders: [{ ...initialBase, ownershipPercentage: 0, incDateOrDob: '' }],
    ubos: [{ ...initialBase }],
    signatories: [{ ...initialBase, authority: '' }],
    secretary: '',
    seniorExecutiveFunction: '',
    isPep: false,
    type: EntityType.ENTITY,
    documents: {
      cr: false, entityCard: false, tradeLicense: false, aoa: false, financials: false,
      uboInfo: false, shareholderIds: false, signatoryIds: false, parentCr: false
    }
  });

  const handleAddEntry = (type: 'directors' | 'shareholders' | 'ubos' | 'signatories') => {
    const fresh = { ...initialBase };
    if (type === 'shareholders') { fresh.ownershipPercentage = 0; fresh.incDateOrDob = ''; }
    if (type === 'signatories') { fresh.authority = ''; }
    
    setFormData(prev => ({ ...prev, [type]: [...prev[type], fresh] }));
  };

  const handleRemoveEntry = (type: 'directors' | 'shareholders' | 'ubos' | 'signatories', index: number) => {
    if (formData[type].length <= 1) return;
    setFormData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const handleEntryChange = (type: 'directors' | 'shareholders' | 'ubos' | 'signatories', index: number, field: string, value: any) => {
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
      case RiskLevel.HIGH: return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">High Risk</span>;
      case RiskLevel.MEDIUM: return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">Medium</span>;
      default: return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Clean</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Onboarding & Compliance</h2>
          <p className="text-sm text-gray-500">KYC/AML Client Lifecycle Management</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-100 font-bold">
          <Plus size={20} /> New Client Onboarding
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search by Client Name, QFC No, or Status..." className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className="flex items-center gap-2 px-5 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold transition-colors">
          <Filter size={18} /> Filters
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Client Identity</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Registration</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Compliance</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.filter(c => c.firstName.toLowerCase().includes(searchTerm.toLowerCase())).map((client) => (
              <tr key={client.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="font-bold text-gray-900">{client.firstName}</div>
                  <div className="text-[10px] text-gray-400 font-medium">QFC No: {client.qfcNo || 'N/A'} • {client.legalStructure}</div>
                </td>
                <td className="px-8 py-5">
                  <div className="text-sm font-bold text-gray-700">Ref: {client.no}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Onboarded: {client.onboardingDate}</div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    client.status === 'Active' ? 'bg-green-100 text-green-700' : 
                    client.status === 'Pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-8 py-5">{getRiskBadge(client.riskLevel)}</td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Edit size={16}/></button>
                    <button onClick={() => onDeleteClient(client.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2.5 rounded-2xl"><ShieldCheck size={28}/></div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Onboarding & KYC Portal</h3>
                  <p className="text-xs text-indigo-100 font-bold uppercase tracking-widest opacity-80">QFC / MOCI Compliance Framework</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
              {/* SECTION 1: Company & Engagement */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <Briefcase size={20} />
                  <span>1. Company & Engagement Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">System No *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 2024-001" value={formData.no} onChange={e => setFormData({...formData, no: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Status *</label>
                    <select className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">QFC No</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" placeholder="If applicable" value={formData.qfcNo} onChange={e => setFormData({...formData, qfcNo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Legal Structure *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" placeholder="e.g. LLC" value={formData.legalStructure} onChange={e => setFormData({...formData, legalStructure: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Corporate Nationality *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" placeholder="e.g. Qatari" value={formData.corporateNationality} onChange={e => setFormData({...formData, corporateNationality: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Client Name *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3 font-bold" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Engagement Date *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.engagementDate} onChange={e => setFormData({...formData, engagementDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Onboarding Date *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.onboardingDate} onChange={e => setFormData({...formData, onboardingDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Incorporation Date *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.incorporationDate} onChange={e => setFormData({...formData, incorporationDate: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* SECTION 2: Registration & Licensing */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <Landmark size={20} />
                  <span>2. Registration & Licensing Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">CR Expiry Date *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.crExpiryDate} onChange={e => setFormData({...formData, crExpiryDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Entity Card No *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.entityCardNo} onChange={e => setFormData({...formData, entityCardNo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">License No</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Approved Auditor</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.approvedAuditor} onChange={e => setFormData({...formData, approvedAuditor: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* SECTION 3: Dynamic Personnel Sections */}
              {[
                { title: 'Directors', key: 'directors', icon: <Users size={20}/> },
                { title: 'Significant Shareholders', key: 'shareholders', icon: <Landmark size={20}/> },
                { title: 'Ultimate Beneficial Owners (UBOs)', key: 'ubos', icon: <ShieldCheck size={20}/> },
                { title: 'Authorized Signatories', key: 'signatories', icon: <FileText size={20}/> }
              ].map((section) => (
                <section key={section.key} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider">
                      {section.icon}
                      <span>3. {section.title}</span>
                    </div>
                    <button type="button" onClick={() => handleAddEntry(section.key as any)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all text-xs font-bold flex items-center gap-2">
                      <Plus size={16} /> Add Entry
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {(formData[section.key as any] as any[]).map((person, index) => (
                      <div key={index} className="bg-gray-50/50 p-6 rounded-3xl border-2 border-dashed border-gray-100 relative group hover:border-indigo-200 hover:bg-white transition-all">
                        <button type="button" onClick={() => handleRemoveEntry(section.key as any, index)} className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow-lg border border-red-50 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={16} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Full Name *</label>
                            <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm font-bold bg-white" value={person.name} onChange={e => handleEntryChange(section.key as any, index, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">QID / Passport *</label>
                            <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm font-mono bg-white" value={person.qidOrPassport} onChange={e => handleEntryChange(section.key as any, index, 'qidOrPassport', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nationality *</label>
                            <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" value={person.nationality} onChange={e => handleEntryChange(section.key as any, index, 'nationality', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{section.key === 'shareholders' ? 'Date of Inc/DOB' : 'DOB'} *</label>
                            <input type="date" required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" value={person.dob || person.incDateOrDob} onChange={e => handleEntryChange(section.key as any, index, section.key === 'shareholders' ? 'incDateOrDob' : 'dob', e.target.value)} />
                          </div>
                          {section.key === 'shareholders' && (
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ownership % *</label>
                              <input type="number" step="0.01" required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm font-bold bg-white" value={person.ownershipPercentage} onChange={e => handleEntryChange('shareholders', index, 'ownershipPercentage', parseFloat(e.target.value))} />
                            </div>
                          )}
                          {section.key === 'signatories' && (
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Authority Level *</label>
                              <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" placeholder="e.g. Managing Director" value={person.authority} onChange={e => handleEntryChange('signatories', index, 'authority', e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* SECTION 4: Governance */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <ShieldCheck size={20} />
                  <span>4. Governance & Key Roles</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Secretary</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.secretary} onChange={e => setFormData({...formData, secretary: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Senior Executive Function</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.seniorExecutiveFunction} onChange={e => setFormData({...formData, seniorExecutiveFunction: e.target.value})} />
                  </div>
                </div>
              </section>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-gray-100 py-8 flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-gray-500 hover:bg-gray-50 rounded-2xl font-bold transition-all">Cancel Application</button>
                <button type="submit" className="px-12 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 font-black transition-all transform active:scale-95 flex items-center gap-3">
                  <Check size={24} strokeWidth={3}/> Complete Onboarding & Screen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;