
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ClientDocument } from '../types';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '1qoMrZspi5uGvjqGaDuxx5zCvFfPf3R3d';

export const createOAuth2Client = (redirectUri: string) => {
  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    redirectUri
  );
};

export const getDriveClient = (tokens: any) => {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET
  );
  oauth2Client.setCredentials(tokens);
  return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Ensures a folder for the client exists under the master parent folder.
 * Logic: Search for folder named ClientID_Name. If not found, create it.
 */
export const getOrCreateClientFolder = async (drive: any, clientId: string, clientName: string) => {
  const folderName = `${clientId}_${clientName.replace(/[^\w\s-]/gi, '')}`;
  
  // 1. Search for existing folder
  const response = await drive.files.list({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${PARENT_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // 2. Create if not found
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [PARENT_FOLDER_ID],
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id',
  });

  return folder.data.id;
};

export const listClientDocuments = async (drive: any, folderId: string): Promise<ClientDocument[]> => {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, size, description)',
  });

  return (response.data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink,
    webContentLink: f.webContentLink,
    createdTime: f.createdTime,
    size: parseInt(f.size || '0'),
    description: f.description || '',
    type: f.mimeType // or map to a cleaner string
  }));
};

export const uploadFileToFolder = async (
  drive: any, 
  folderId: string, 
  fileName: string, 
  mimeType: string, 
  buffer: Buffer,
  description?: string
) => {
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    description: description || ''
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink',
  });

  return response.data;
};

export const deleteFile = async (drive: any, fileId: string) => {
  await drive.files.delete({
    fileId: fileId,
  });
};
