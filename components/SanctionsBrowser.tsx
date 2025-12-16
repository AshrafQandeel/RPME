import React, { useState, useEffect, useRef } from 'react';
import { SanctionEntry } from '../types';
import { RefreshCw, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload } from 'lucide-react';

interface SanctionsBrowserProps {
  sanctions: SanctionEntry[];
  lastUpdated: string;
  onRefresh: () => void;
  isUpdating: boolean;
  onFileUpload: (file: File) => void;
}

const ITEMS_PER_PAGE = 15;

const SanctionsBrowser: React.FC<SanctionsBrowserProps> = ({ sanctions, lastUpdated, onRefresh, isUpdating, onFileUpload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset to first page when search term changes or data updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sanctions]);

  const filtered = sanctions.filter(s => 
    s.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.unListType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Global Sanctions List</h2>
           <p className="text-sm text-gray-500">Sources: UN Consolidated List • Qatar NCTC Unified List</p>
           <p className="text-xs text-gray-400 mt-1">Last Updated: {lastUpdated !== 'Never' ? new Date(lastUpdated).toLocaleString() : 'Never'}</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xml" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload size={18} />
            Import XML
          </button>
          <button 
            onClick={onRefresh}
            disabled={isUpdating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all shadow-sm ${isUpdating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
            {isUpdating ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

       {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, list type, or source..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ref #</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">List Type</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nationality</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Listed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((entry) => (
                <tr key={entry.dataId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                         entry.source === 'Qatar NCTC' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                     }`}>
                        {entry.source}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{entry.referenceNumber}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {entry.firstName} {entry.lastName}
                    {entry.aliases.length > 0 && <div className="text-xs text-gray-400 mt-0.5">AKA: {entry.aliases[0]}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {entry.unListType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.nationality || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.listedOn}</td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                     No records found matching your search.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to <span className="font-medium text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-medium text-gray-900">{filtered.length}</span> entries
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(1)} 
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 min-w-[100px] text-center">
                Page {currentPage} of {totalPages}
              </span>

              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => handlePageChange(totalPages)} 
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SanctionsBrowser;