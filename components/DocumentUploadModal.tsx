
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Upload, File, Trash2, ExternalLink, 
  Loader2, AlertCircle, CheckCircle2, CloudUpload,
  FileText, Image as ImageIcon, FileCode, Download,
  AlertTriangle
} from 'lucide-react';
import { Client, ClientDocument } from '../types';
import { 
  listDocuments, 
  uploadDocument, 
  deleteDocument,
  ensureBucketExists
} from '../services/storageService';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onUpdateClient: (updatedClient: Client) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  client,
  onUpdateClient
}) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        setIsInitializing(true);
        setError(null);
        setConfigMissing(false);
        setConfirmDeleteId(null);
        try {
          await ensureBucketExists();
          await loadDocuments();
        } catch (e: any) {
          if (e.message.includes('configuration missing') || e.message.includes('credentials not configured')) {
            setConfigMissing(true);
          } else {
            setError(e.message || 'Storage initialization failed');
          }
        } finally {
          setIsInitializing(false);
        }
      };
      init();
    }
  }, [isOpen, client.id]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await listDocuments(client.id);
      setDocuments(docs as any);
      
      // Update client document count if needed (simplified)
      if (docs.length !== client.document_count) {
        onUpdateClient({ 
          ...client, 
          document_count: docs.length 
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(10);
    
    try {
      for (const file of files) {
        await uploadDocument(client.id, file);
      }
      setUploadProgress(100);
      
      // Load and update parent immediately
      const docs = await listDocuments(client.id);
      setDocuments(docs as any);
      onUpdateClient({ 
        ...client, 
        document_count: docs.length 
      });

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 800);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    console.log("[Storage] Initiating deletion for path:", fileId);
    setError(null);

    // Final sanity check
    if (!confirmDeleteId && !window.confirm("Are you sure you want to permanently delete this document?")) {
      return;
    }

    try {
      const success = await deleteDocument(fileId);
      if (success) {
        console.log("[Storage] Deletion successful for:", fileId);
        const updatedDocs = documents.filter(d => d.id !== fileId);
        setDocuments(updatedDocs);
        setConfirmDeleteId(null);
        
        // Push update to parent state immediately
        onUpdateClient({ 
          ...client, 
          document_count: updatedDocs.length 
        });
      } else {
        throw new Error("Deletion reported as successful but file may still exist.");
      }
    } catch (err: any) {
      console.error("[Storage] Deletion failure:", err);
      setError(`Deletion Failed: ${err.message || 'Unknown storage error'}`);
      setConfirmDeleteId(null);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (t.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (t.includes('word') || t.includes('officedocument')) return <File className="w-8 h-8 text-blue-700" />;
    if (t.includes('sheet') || t.includes('excel')) return <FileCode className="w-8 h-8 text-green-600" />;
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-bottom flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Document Management</h2>
            <p className="text-sm text-gray-500">{client["Client Name"]} • ID: {client.id || 'N/A'}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium font-mono text-sm uppercase tracking-widest">Bridging Supabase Storage...</p>
            </div>
          ) : configMissing ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-amber-50 flex items-center justify-center rounded-2xl mb-6">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight uppercase">Supabase Connection Required</h3>
              <p className="text-gray-600 max-w-md mb-8 leading-relaxed">
                To move your storage to Supabase, you must provide your project credentials in the <span className="font-bold text-indigo-600">Settings</span> menu.
              </p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-left w-full max-w-sm space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Step 1: Get Keys</p>
                  <p className="text-sm text-gray-700">Go to <span className="font-mono bg-white px-1 border rounded text-xs">Project Settings -{">"} API</span> in Supabase.</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Step 2: Update Settings</p>
                  <p className="text-sm text-gray-700">Add <span className="font-mono bg-white px-1 border rounded text-xs">VITE_SUPABASE_URL</span> and <span className="font-mono bg-white px-1 border rounded text-xs">VITE_SUPABASE_ANON_KEY</span> to the Settings menu.</p>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-amber-700 bg-amber-100/50 p-3 rounded-lg border border-amber-100 font-medium leading-snug">
                    Note: Changes to environment variables require a page refresh to take effect.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upload Area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all
                  ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}
                  ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl shadow-sm mb-4">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-indigo-600" />
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX, Images (Max 50MB)</p>
                
                {isUploading ? (
                  <div className="mt-4 w-full max-w-xs transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic animate-pulse">Syncing to Bucket...</span>
                      <span className="text-[10px] font-black text-indigo-600">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                      />
                    </div>
                  </div>
                ) : uploadProgress === 100 ? (
                  <div className="mt-4 flex items-center gap-2 text-emerald-600 animate-in fade-in zoom-in-95">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-xs font-bold">Documents Successfully Stored</span>
                  </div>
                ) : null}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-red-900">Storage Error</p>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Documents List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Secure Bucket Vault ({documents.length})
                  </h3>
                  {isLoading && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                </div>

                <div className="space-y-3">
                  {documents.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border border-dotted">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                      <p className="text-sm text-gray-500">No documents found in Supabase storage for this entity.</p>
                    </div>
                  )}

                  <AnimatePresence>
                    {documents.map((doc) => (
                      <motion.div 
                        key={doc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all"
                      >
                        <div className="shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2">
                            {formatSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {confirmDeleteId === doc.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg animate-in fade-in zoom-in-95">
                              <span className="text-[8px] font-black text-red-600 uppercase px-1">Confirm?</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                className="p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="p-1.5 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                title="View / Download"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(doc.id);
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-top flex justify-between items-center">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Supabase Storage Integrated</p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
