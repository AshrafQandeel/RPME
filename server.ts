import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Proxy endpoint to bypass CORS for sanctions lists
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).json({ error: 'URL parameter is required' });

  try {
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
    res.status(500).json({ error: 'Failed to fetch external resource', details: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production static serving
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Development Vite support (Dynamic import to avoid Vercel build issues)
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

// Only start the server if we're not in a Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
