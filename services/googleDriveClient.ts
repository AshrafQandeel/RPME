
import { ClientDocument } from '../types';

export const getGoogleAuthUrl = async () => {
  const response = await fetch('/api/auth/google/url');
  if (!response.ok) throw new Error('Failed to get auth URL');
  return await response.json();
};

export const checkGoogleAuthStatus = async () => {
  const response = await fetch('/api/auth/google/status');
  if (!response.ok) return { authenticated: false };
  return await response.json();
};

export const logoutGoogle = async () => {
  const response = await fetch('/api/auth/google/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Logout failed');
  return await response.json();
};

export const listDocuments = async (clientId: string, clientName: string, folderId?: string): Promise<{ folderId: string, files: ClientDocument[] }> => {
  const url = new URL(`/api/drive/list/${clientId}`, window.location.origin);
  url.searchParams.append('name', clientName);
  if (folderId) url.searchParams.append('folderId', folderId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list documents');
  }
  return await response.json();
};

export const uploadDocuments = async (
  clientId: string, 
  clientName: string, 
  files: File[], 
  folderId?: string,
  description?: string
) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('clientName', clientName);
  if (folderId) formData.append('folderId', folderId);
  if (description) formData.append('description', description);

  const response = await fetch(`/api/drive/upload/${clientId}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  return await response.json();
};

export const deleteDocument = async (fileId: string) => {
  const response = await fetch(`/api/drive/files/${fileId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Delete failed');
  }
  return await response.json();
};
