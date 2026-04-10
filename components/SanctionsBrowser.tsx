
import React, { useState, useEffect, useRef } from 'react';
import { SanctionEntry } from '../types';
import { RefreshCw, Search, ChevronLeft, ChevronRight, Upload, FileCheck, Globe, Loader2, X, AlertTriangle } from 'lucide-react';
import { searchSanctionsAuthoritative } from '../services/cloudDb';

interface SanctionsBrowserProps {
  lastUpdated: string;
  onRefresh: () => void;
  isUpdating: boolean;
  onFileUpload: (file: File) => void;
  totalInDb?: number;
}

const ITEMS_PER_PAGE = 15;

const SanctionsBrowser: React.FC<SanctionsBrowserProps> = ({ lastUpdated, onRefresh, isUpdating, onFileUpload, totalInDb = 0 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<SanctionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      setIsLoading(true);
      const res = await searchSanctionsAuthoritative(searchTerm, (currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      setData(res.data);
      setTotal(res.count);
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, currentPage]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div>
           <h2 className="text-xl font-black text-slate-900 uppercase">Global Registry</h2>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Indexed: {totalInDb.toLocaleString()}</p>
        </div>
        <div className="flex gap-4">
          <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && onFileUpload(e.target.files[0])} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Import List</button>
          <button onClick={onRefresh} className="p-3 border rounded-xl hover:bg-gray-50"><RefreshCw size={20} className={isUpdating ? 'animate-spin' : ''}/></button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input type="text" placeholder="Search registry..." className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm text-sm font-bold" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-800" size={18}/>}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead className="bg-gray-50 border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 <th className="px-8 py-5">Identity</th>
                 <th className="px-8 py-5">Nationality</th>
                 <th className="px-8 py-5 text-right">Source</th>
              </tr>
           </thead>
           <tbody className="divide-y">
              {data.map(s => (
                <tr key={s.dataId} className="hover:bg-gray-50">
                  <td className="px-8 py-4">
                    <div className="text-sm font-black text-slate-900 uppercase">{[s.firstName, s.lastName].filter(Boolean).join(' ')}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase">{s.referenceNumber || s.dataId}</div>
                  </td>
                  <td className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase">{s.nationality || 'N/A'}</td>
                  <td className="px-8 py-4 text-right"><span className="px-2 py-1 bg-gray-50 rounded text-[8px] font-black uppercase text-gray-500">{s.source}</span></td>
                </tr>
              ))}
              {data.length === 0 && !isLoading && <tr><td colSpan={3} className="py-20 text-center text-gray-300 font-black text-xs uppercase">No Results</td></tr>}
           </tbody>
        </table>
        {totalPages > 1 && (
          <div className="p-6 border-t flex justify-between items-center bg-gray-50/30">
             <span className="text-[10px] font-black text-gray-400 uppercase">Page {currentPage} of {totalPages}</span>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 border rounded-lg bg-white"><ChevronLeft size={16}/></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 border rounded-lg bg-white"><ChevronRight size={16}/></button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SanctionsBrowser;
