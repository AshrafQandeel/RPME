
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { 
  createOAuth2Client, 
  getDriveClient, 
  getOrCreateClientFolder, 
  listClientDocuments, 
  uploadFileToFolder, 
  deleteFile 
} from './services/googleDriveService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const upload = multer({ storage: multer.memoryStorage() });

// --- Google OAuth Routes ---

app.get('/api/auth/google/url', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/google/callback`;
  
  const oauth2Client = createOAuth2Client(redirectUri);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const code = req.query.code as string;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/google/callback`;

  try {
    const oauth2Client = createOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set tokens in a secure cookie
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Google OAuth Error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/google/status', (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ authenticated: !!tokens });
});

app.post('/api/auth/google/logout', (req, res) => {
  res.clearCookie('google_tokens', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

// --- Google Drive API Routes ---

const getDriveFromReq = (req: any) => {
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) throw new Error('NOT_AUTHENTICATED');
  const tokens = JSON.parse(tokenStr);
  return getDriveClient(tokens);
};

app.get('/api/drive/list/:clientId', async (req: any, res) => {
  try {
    const drive = getDriveFromReq(req);
    const { clientId } = req.params;
    const clientName = req.query.name as string || 'Unknown';
    
    // Use the folder ID from the request if provided, otherwise find/create
    let folderId = req.query.folderId as string;
    if (!folderId || folderId === 'undefined') {
      folderId = await getOrCreateClientFolder(drive, clientId, clientName);
    }

    const files = await listClientDocuments(drive, folderId);
    res.json({ folderId, files });
  } catch (error: any) {
    console.error('Drive List Error:', error);
    if (error.message === 'NOT_AUTHENTICATED') {
      return res.status(401).json({ error: 'Please connect your Google Drive' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drive/upload/:clientId', upload.array('files'), async (req: any, res) => {
  try {
    const drive = getDriveFromReq(req);
    const { clientId } = req.params;
    const clientName = req.body.clientName || 'Unknown';
    const folderId = req.body.folderId || await getOrCreateClientFolder(drive, clientId, clientName);
    
    const files = req.files as Express.Multer.File[];
    const uploadResults = [];

    for (const file of files) {
      const result = await uploadFileToFolder(
        drive,
        folderId,
        file.originalname,
        file.mimetype,
        file.buffer,
        req.body.description
      );
      uploadResults.push(result);
    }

    res.json({ success: true, folderId, files: uploadResults });
  } catch (error: any) {
    console.error('Drive Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/drive/files/:fileId', async (req: any, res) => {
  try {
    const drive = getDriveFromReq(req);
    const { fileId } = req.params;
    await deleteFile(drive, fileId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Drive Delete Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint to bypass CORS for sanctions lists
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log(`[Proxy] Fetching: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*'
      },
      responseType: 'text'
    });
    
    res.send(response.data);
  } catch (error: any) {
    console.error(`[Proxy] Error fetching ${targetUrl}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to fetch external resource', 
      details: error.message,
      url: targetUrl
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    env: process.env.NODE_ENV
  });
});

// Advanced Screening Route
app.post('/api/screening/advanced', async (req, res) => {
  const { client, potentialMatches } = req.body;
  const clientName = client?.["Client Name"] || 'Unknown';
  console.log(`[Server] >>> Start Advanced Screening for: ${clientName}`);

  try {
    if (!client) {
      return res.status(400).json({ error: 'Client data is required' });
    }

    // Dynamic import to Gemini Service
    const { performAdvancedScreening } = await import('./services/geminiService');
    
    console.log('[Server] Executing AI Analysis...');
    const report = await performAdvancedScreening(client, potentialMatches || []);
    
    console.log(`[Server] <<< Screening result: ${report?.overall_result || 'CLEAR'}`);
    res.json(report);
  } catch (error: any) {
    console.error('[Advanced Screening API] CRITICAL ERROR:', error.message);
    res.status(500).json({ 
      error: error.message || 'An error occurred during screening',
      type: 'AI_SCREENING_ERROR'
    });
  }
});

// Production static serving
const distPath = path.join(process.cwd(), 'dist');

// Development Vite support
// In AI Studio, we want Vite middleware unless we are explicitly in production AND dist exists
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

if (!isVercel && !isProduction) {
  console.log('[Server] Starting in Development mode with Vite middleware');
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  console.log(`[Server] Starting in Production mode. Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
}

// SPA fallback
app.get('*all', (req, res) => {
  // If it's an API route that wasn't caught, don't serve index.html
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  
  // In production, serve index.html. In dev, Vite handles this.
  if (isVercel || isProduction) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// Only start the server if we're not in a Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Export for Vercel
export default app;
