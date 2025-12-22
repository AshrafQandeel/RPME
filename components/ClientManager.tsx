import React, { useState } from 'react';
import { Client, EntityType, RiskLevel, KYCIndividual } from '../types';
import { Plus, Search, Filter, Trash2, Edit, RefreshCw, Building2, UserPlus, ShieldCheck, FileText, Upload, AlertCircle, X, Check } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'riskLevel'>) => void;
  onDeleteClient: (id: string) => void;
  onRefresh?: () => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onDeleteClient, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Simulate file upload and update the document check state
  const handleSimulateUpload = (docKey: keyof typeof formData.documents) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: true
      }
    }));
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
            <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors shadow-sm">
              <RefreshCw size={18} /> Refresh
            </button>
          )}
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} /> Start New Onboarding
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search CR Number, Company Name..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium">
          <Filter size={18} /> Filter
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider">Entity Details</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider">CR / Registration</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider">AML Score</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider">Contact Details</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="font-bold text-gray-900">{client.firstName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{client.natureOfBusiness}</div>
                </td>
                <td className="px-8 py-5">
                  <div className="text-sm font-bold text-slate-700"># {client.crNumber}</div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Exp: {client.crExpiry}</div>
                </td>
                <td className="px-8 py-5">{getRiskBadge(client.riskLevel)}</td>
                <td className="px-8 py-5">
                  <div className="text-xs font-medium text-gray-700">{client.emailAddress}</div>
                  <div className="text-[10px] text-gray-400">{client.telephoneNumber}</div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-white rounded-lg transition-colors"><Edit size={16} /></button>
                    <button onClick={() => onDeleteClient(client.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-white rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">No onboarding records found in the current environment.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2.5 rounded-2xl">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">KYC Onboarding Portal</h3>
                  <p className="text-xs text-indigo-100 font-bold uppercase tracking-widest opacity-80">Qatar Anti-Money Laundering Framework</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                  <Building2 size={20} />
                  <span>1. Corporate Identity Profile</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Company Name (As per CR) *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Nature of Business *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.natureOfBusiness} onChange={e => setFormData({...formData, natureOfBusiness: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">CR Number *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-mono" value={formData.crNumber} onChange={e => setFormData({...formData, crNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">CR Expiry Date *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.crExpiry} onChange={e => setFormData({...formData, crExpiry: e.target.value})} />
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Service Category *</label>
                    <select required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.serviceNeeded} onChange={e => setFormData({...formData, serviceNeeded: e.target.value})}>
                      <option value="">Select Service...</option>
                      <option value="Audit">Statutory Audit</option>
                      <option value="Tax">Tax Compliance</option>
                      <option value="Formation">Company Formation</option>
                      <option value="Advisory">Risk Advisory</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Entity Card Number *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-mono" value={formData.entityCardNumber} onChange={e => setFormData({...formData, entityCardNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Entity Card Expiry *</label>
                    <input type="date" required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.entityCardExpiry} onChange={e => setFormData({...formData, entityCardExpiry: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Email Address *</label>
                    <input type="email" required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.emailAddress} onChange={e => setFormData({...formData, emailAddress: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Telephone *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.telephoneNumber} onChange={e => setFormData({...formData, telephoneNumber: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Registered Office Address *</label>
                    <input required className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.registeredAddress} onChange={e => setFormData({...formData, registeredAddress: e.target.value})} />
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Corporate Website</label>
                    <input className="w-full border-gray-100 border-2 rounded-2xl p-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                  </div>
                </div>
              </section>

              {[
                { label: 'Shareholders', key: 'shareholders', icon: <UserPlus size={20}/> },
                { label: 'Ultimate Beneficial Owners (UBOs)', key: 'ubos', icon: <ShieldCheck size={20}/> },
                { label: 'Authorized Signatories', key: 'signatories', icon: <FileText size={20}/> }
              ].map((section) => (
                <section key={section.key} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider">
                      {section.icon}
                      <span>2. {section.label}</span>
                    </div>
                    <button type="button" onClick={() => handleAddPerson(section.key as any)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all text-xs font-bold flex items-center gap-2">
                      <Plus size={16} /> Add Entry
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {(formData[section.key as any] as KYCIndividual[]).map((person, index) => (
                      <div key={index} className="bg-gray-50/50 p-6 rounded-3xl border-2 border-dashed border-gray-100 relative group transition-all hover:border-indigo-200 hover:bg-white">
                        <button type="button" onClick={() => handleRemovePerson(section.key as any, index)} className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all border border-red-50">
                          <X size={16} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="lg:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Full Legal Name</label>
                            <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm font-bold bg-white" value={person.name} onChange={e => handlePersonChange(section.key as any, index, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nationality</label>
                            <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" value={person.nationality} onChange={e => handlePersonChange(section.key as any, index, 'nationality', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Date of Birth</label>
                            <input type="date" required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" value={person.dob} onChange={e => handlePersonChange(section.key as any, index, 'dob', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">QID / Passport #</label>
                            <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm font-mono bg-white" value={person.qidNumber} onChange={e => handlePersonChange(section.key as any, index, 'qidNumber', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">QID Expiry Date</label>
                            <input type="date" required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" value={person.qidExpiry} onChange={e => handlePersonChange(section.key as any, index, 'qidExpiry', e.target.value)} />
                          </div>
                          {section.key === 'shareholders' && (
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ownership %</label>
                              <input type="number" step="0.01" required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm font-bold bg-white" value={person.ownershipPercentage} onChange={e => handlePersonChange('shareholders', index, 'ownershipPercentage', parseFloat(e.target.value))} />
                            </div>
                          )}
                          {section.key === 'signatories' && (
                            <div className="lg:col-span-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Delegated Authority</label>
                              <input required className="w-full border-gray-200 border rounded-xl p-2.5 text-sm bg-white" placeholder="e.g. Managing Director / Full Financial Power" value={person.authority} onChange={e => handlePersonChange('signatories', index, 'authority', e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                <div className="space-y-6">
                   <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                    <ShieldCheck size={20} />
                    <span>3. AML Declarations</span>
                  </div>
                  <div className={`p-6 rounded-3xl border-2 transition-all ${formData.isPep ? 'bg-red-50 border-red-200' : 'bg-green-50/50 border-green-100'}`}>
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input type="checkbox" className="w-6 h-6 mt-1 rounded-lg border-gray-300 text-red-600 focus:ring-red-500" checked={formData.isPep} onChange={e => setFormData({...formData, isPep: e.target.checked})} />
                      <div>
                        <span className="font-black text-gray-900 block mb-1">PEP (Politically Exposed Person) Declaration</span>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">Confirm if any shareholders, UBOs, or signatories occupy a prominent public position or have a close association with such individuals.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-indigo-700 font-black text-sm uppercase tracking-wider border-b border-indigo-50 pb-2">
                    <FileText size={20} />
                    <span>4. Supporting Documentation</span>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(formData.documents).map((docKey) => (
                      <div key={docKey} className="flex items-center justify-between p-3 px-5 hover:bg-gray-50 rounded-2xl group border border-transparent hover:border-gray-100 transition-all">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${ (formData.documents as any)[docKey] ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200'}`}>
                            {(formData.documents as any)[docKey] && <Check size={14} strokeWidth={4}/>}
                          </div>
                          <span className="text-xs font-bold text-gray-700 capitalize">{docKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                        <button 
                          type="button" 
                          onClick={() => handleSimulateUpload(docKey as any)}
                          className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${(formData.documents as any)[docKey] ? 'text-green-600 bg-green-50' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 opacity-0 group-hover:opacity-100'}`}
                        >
                          <Upload size={14} />
                          {(formData.documents as any)[docKey] ? 'File Linked' : 'Upload'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-100 py-8 flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-gray-500 hover:bg-gray-50 rounded-2xl font-bold transition-all">Cancel Application</button>
                <button type="submit" className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 font-black transition-all transform active:scale-95 flex items-center gap-2">
                  <ShieldCheck size={20}/> Submit & Screen Entity
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