
import React, { useState } from 'react';
import { Client, EntityType, RiskLevel, KYCDirector, KYCShareholder, KYCUBO, KYCAuthorizedSignatory } from '../types';
import { Plus, Search, Filter, Trash2, Edit, RefreshCw, Building2, UserPlus, ShieldCheck, FileText, Upload, X, Check, Users, Briefcase, Landmark, Globe, Mail, Phone, ExternalLink } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => void;
  onDeleteClient: (id: string) => void;
  onRefresh?: () => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onDeleteClient, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt' | 'riskLevel'>>({
    no: '',
    status: 'Pending',
    qfcNo: '',
    legalStructure: '',
    corporateNationality: '',
    firstName: '',
    companyType: '',
    servicesNeeded: '',
    engagementYear: new Date().getFullYear().toString(),
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
    directors: [{ name: '', qidOrPassport: '', nationality: '', dob: '' }],
    shareholders: [{ name: '', ownershipPercentage: 0, qidPassportCrNo: '', nationality: '', dobOrDoi: '' }],
    ubos: [{ name: '', qidOrPassport: '', nationality: '', dob: '' }],
    signatories: [{ name: '', qidOrPassport: '', nationality: '', dob: '', authority: '' }],
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
    let fresh: any;
    if (type === 'directors') fresh = { name: '', qidOrPassport: '', nationality: '', dob: '' };
    if (type === 'shareholders') fresh = { name: '', ownershipPercentage: 0, qidPassportCrNo: '', nationality: '', dobOrDoi: '' };
    if (type === 'ubos') fresh = { name: '', qidOrPassport: '', nationality: '', dob: '' };
    if (type === 'signatories') fresh = { name: '', qidOrPassport: '', nationality: '', dob: '', authority: '' };
    
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
          <h2 className="text-2xl font-bold text-gray-800">Client Compliance & Onboarding</h2>
          <p className="text-sm text-gray-500">Corporate KYC Lifecycle Management</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-100 font-bold">
          <Plus size={20} /> Start New Onboarding
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search by Client Name, QFC No, or No..." className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Status / No</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Type</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Compliance</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.filter(c => c.firstName.toLowerCase().includes(searchTerm.toLowerCase())).map((client) => (
              <tr key={client.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="font-bold text-gray-900">{client.firstName}</div>
                  <div className="text-[10px] text-gray-400 font-medium">QFC: {client.qfcNo || 'N/A'} • {client.corporateNationality}</div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className={`w-fit px-2 py-0.5 rounded-full text-[9px] font-bold mb-1 ${
                      client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {client.status}
                    </span>
                    <span className="text-xs font-bold text-gray-600">No: {client.no}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs text-gray-500">{client.companyType}</td>
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
                  <h3 className="text-2xl font-black tracking-tight">Onboarding Form</h3>
                  <p className="text-xs text-indigo-100 font-bold uppercase tracking-widest opacity-80">KYC / AML Compliance Protocol</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
              {/* SECTION 1: Company & Engagement */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <Briefcase size={20} />
                  <span>Company & Engagement Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">No *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.no} onChange={e => setFormData({...formData, no: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Status *</label>
                    <select className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                      <option value="Blacklisted">Blacklisted</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">QFC No</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.qfcNo} onChange={e => setFormData({...formData, qfcNo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Legal Structure *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.legalStructure} onChange={e => setFormData({...formData, legalStructure: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Corporate Nationality *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.corporateNationality} onChange={e => setFormData({...formData, corporateNationality: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Client Name *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3 font-bold" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Company Type *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.companyType} onChange={e => setFormData({...formData, companyType: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Services needed *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.servicesNeeded} onChange={e => setFormData({...formData, servicesNeeded: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Engagement Year *</label>
                    <input required type="number" className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.engagementYear} onChange={e => setFormData({...formData, engagementYear: e.target.value})} />
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
                    <label className="text-[10px] font-black text-gray-400 uppercase">Date of QFC Incorporation or Registration *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.incorporationDate} onChange={e => setFormData({...formData, incorporationDate: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* SECTION 2: Registration & Licensing */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <Landmark size={20} />
                  <span>Registration & Licensing Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">CR Expired date *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.crExpiryDate} onChange={e => setFormData({...formData, crExpiryDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Entity Card No *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.entityCardNo} onChange={e => setFormData({...formData, entityCardNo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Entity Card Expiry *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.entityCardExpiry} onChange={e => setFormData({...formData, entityCardExpiry: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">License</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">License Expiry</label>
                    <input type="date" className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.licenseExpiry} onChange={e => setFormData({...formData, licenseExpiry: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Approved Auditor</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.approvedAuditor} onChange={e => setFormData({...formData, approvedAuditor: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* SECTION 3: Business & Contact Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <Globe size={20} />
                  <span>Business & Contact Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Nature of Business *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.natureOfBusiness} onChange={e => setFormData({...formData, natureOfBusiness: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Registered Address *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.registeredAddress} onChange={e => setFormData({...formData, registeredAddress: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Phone size={12}/> Telephone Number *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.telephoneNumber} onChange={e => setFormData({...formData, telephoneNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Mail size={12}/> E Mail *</label>
                    <input required type="email" className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.emailAddress} onChange={e => setFormData({...formData, emailAddress: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><ExternalLink size={12}/> Website</label>
                    <input className="w-full border-gray-100 border-2 rounded-xl p-3" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* SECTION 4: Multi-Entry Personnel */}
              <section className="space-y-10">
                {/* Directors */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase">
                      <Users size={20} />
                      <span>Directors</span>
                    </div>
                    <button type="button" onClick={() => handleAddEntry('directors')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1">
                      <Plus size={14} /> Add another director
                    </button>
                  </div>
                  {formData.directors.map((p, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-2xl relative group">
                      <button type="button" onClick={() => handleRemoveEntry('directors', i)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-red-50"><Trash2 size={14}/></button>
                      <div className="md:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Director Names *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.name} onChange={e => handleEntryChange('directors', i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">QID / Passport *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.qidOrPassport} onChange={e => handleEntryChange('directors', i, 'qidOrPassport', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nationality *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.nationality} onChange={e => handleEntryChange('directors', i, 'nationality', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">DOB *</label>
                        <input required type="date" className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.dob} onChange={e => handleEntryChange('directors', i, 'dob', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shareholders */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase">
                      <Landmark size={20} />
                      <span>Significant Shareholders</span>
                    </div>
                    <button type="button" onClick={() => handleAddEntry('shareholders')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1">
                      <Plus size={14} /> Add another shareholder
                    </button>
                  </div>
                  {formData.shareholders.map((p, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50/50 p-4 rounded-2xl relative group">
                      <button type="button" onClick={() => handleRemoveEntry('shareholders', i)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-red-50"><Trash2 size={14}/></button>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Shareholder Name *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.name} onChange={e => handleEntryChange('shareholders', i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">% on Ownership *</label>
                        <input required type="number" step="0.01" className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.ownershipPercentage} onChange={e => handleEntryChange('shareholders', i, 'ownershipPercentage', parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">QID / Passport / CR No. *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.qidPassportCrNo} onChange={e => handleEntryChange('shareholders', i, 'qidPassportCrNo', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nationality *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.nationality} onChange={e => handleEntryChange('shareholders', i, 'nationality', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">DOB/ Date of incorporation *</label>
                        <input required type="date" className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.dobOrDoi} onChange={e => handleEntryChange('shareholders', i, 'dobOrDoi', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* UBOs */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase">
                      <ShieldCheck size={20} />
                      <span>UBO Details</span>
                    </div>
                    <button type="button" onClick={() => handleAddEntry('ubos')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1">
                      <Plus size={14} /> Add another UBO
                    </button>
                  </div>
                  {formData.ubos.map((p, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-2xl relative group">
                      <button type="button" onClick={() => handleRemoveEntry('ubos', i)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-red-50"><Trash2 size={14}/></button>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Name *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.name} onChange={e => handleEntryChange('ubos', i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">QID / Passport *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.qidOrPassport} onChange={e => handleEntryChange('ubos', i, 'qidOrPassport', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nationality *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.nationality} onChange={e => handleEntryChange('ubos', i, 'nationality', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">DOB *</label>
                        <input required type="date" className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.dob} onChange={e => handleEntryChange('ubos', i, 'dob', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Authorized Signatories */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase">
                      <FileText size={20} />
                      <span>Authorized Signatory</span>
                    </div>
                    <button type="button" onClick={() => handleAddEntry('signatories')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1">
                      <Plus size={14} /> Add another authorized signatory
                    </button>
                  </div>
                  {formData.signatories.map((p, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50/50 p-4 rounded-2xl relative group">
                      <button type="button" onClick={() => handleRemoveEntry('signatories', i)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-red-50"><Trash2 size={14}/></button>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Name *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.name} onChange={e => handleEntryChange('signatories', i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">QID / Passport *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.qidOrPassport} onChange={e => handleEntryChange('signatories', i, 'qidOrPassport', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nationality *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.nationality} onChange={e => handleEntryChange('signatories', i, 'nationality', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">DOB *</label>
                        <input required type="date" className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.dob} onChange={e => handleEntryChange('signatories', i, 'dob', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Authority *</label>
                        <input required className="w-full p-2 text-sm border-gray-200 border rounded-xl" value={p.authority} onChange={e => handleEntryChange('signatories', i, 'authority', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION 5: Governance & Roles */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <ShieldCheck size={20} />
                  <span>Governance & Key Roles</span>
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
                  <Check size={24} strokeWidth={3}/> Complete & Screen Record
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
