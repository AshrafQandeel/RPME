
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Upload, File, Trash2, ExternalLink, 
  Loader2, AlertCircle, CheckCircle2, CloudUpload,
  FileText, Image as ImageIcon, FileCode, Download,
  AlertTriangle
} from 'lucide-react';
import { Client, ClientDocument } from '../types';
import { 
  getGoogleAuthUrl, 
  checkGoogleAuthStatus, 
  listDocuments, 
  uploadDocuments, 
  deleteDocument 
} from '../services/googleDriveClient';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [folderId, setFolderId] = useState<string | undefined>(client.google_drive_folder_id);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAuthenticated && isOpen && client.id) {
      loadDocuments();
    }
  }, [isAuthenticated, isOpen, client.id]);

  const checkAuth = async () => {
    try {
      const { authenticated } = await checkGoogleAuthStatus();
      setIsAuthenticated(authenticated);
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listDocuments(client.id, client["Client Name"], folderId);
      setDocuments(result.files);
      setFolderId(result.folderId);
      
      // Update client if folderId changed
      if (result.folderId !== client.google_drive_folder_id) {
        onUpdateClient({ 
          ...client, 
          google_drive_folder_id: result.folderId,
          document_count: result.files.length 
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { url } = await getGoogleAuthUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert('Popup blocked! Please allow popups to connect Google Drive.');
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setIsAuthenticated(true);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      setError('Failed to initiate auth: ' + err.message);
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
      await uploadDocuments(client.id, client["Client Name"], files, folderId);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        loadDocuments();
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(fileId);
      setDocuments(prev => prev.filter(d => d.id !== fileId));
      onUpdateClient({ 
        ...client, 
        document_count: Math.max(0, (client.document_count || 1) - 1) 
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('word') || mimeType.includes('officedocument')) return <File className="w-8 h-8 text-blue-700" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileCode className="w-8 h-8 text-green-600" />;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
          {isAuthenticated === null ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium font-mono text-sm">Validating Cloud Connection...</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 flex items-center justify-center rounded-2xl mb-4">
                <CloudUpload className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Connect to Google Drive</h3>
              <p className="text-gray-500 max-w-sm mb-6">
                To manage documents for this entity, you need to authorize access to the shared Google Drive folder.
              </p>
              <button 
                onClick={handleConnect}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                Connect Google Account
              </button>
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
                <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX, Images (Max 20MB)</p>
                
                {isUploading && (
                  <div className="mt-4 w-full max-w-xs">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-red-900">Integration Error</p>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Documents List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Uploaded Documents ({documents.length})
                  </h3>
                  {isLoading && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                </div>

                <div className="space-y-3">
                  {documents.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border border-dotted">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                      <p className="text-sm text-gray-500">No documents found for this client.</p>
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
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2">
                            {formatSize(doc.size)} • {new Date(doc.createdTime).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={doc.webViewLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-600 transition-colors"
                            title="View inline"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a 
                            href={doc.webContentLink} 
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-green-600 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          <p className="text-xs text-gray-400 font-mono italic">Google Drive Integration Active</p>
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
