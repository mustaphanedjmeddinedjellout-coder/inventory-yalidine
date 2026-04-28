/**
 * Express Server Entry Point
 * Configures middleware, routes, and static file serving.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { setupDatabase } = require('./db/connection');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ||
  'http://localhost:3000,http://localhost:3001,http://localhost:5173').split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'noireluxewear.me' || hostname === 'www.noireluxewear.me';
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-STORE-KEY'],
};

// Ensure uploads directory exists
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images
app.use('/uploads', express.static(uploadDir, {
  maxAge: '30d',
  etag: true,
  immutable: true,
}));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/yalidine', require('./routes/yalidine'));
app.use('/api/store', require('./routes/store'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err && err.message && err.message.includes('image uploads')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: 'خطأ داخلي في الخادم' });
});

// Serve frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  const assetsDir = path.join(clientDist, 'assets');

  app.use(express.static(clientDist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return;
      }

      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  app.get('/assets/:file', (req, res, next) => {
    const requestedFile = req.params.file || '';
    const ext = path.extname(requestedFile);
    if (!/^index-[\w-]+\.(js|css)$/.test(requestedFile) || !fs.existsSync(assetsDir)) {
      return next();
    }

    const candidates = fs.readdirSync(assetsDir)
      .filter((file) => file.startsWith('index-') && path.extname(file) === ext)
      .map((file) => {
        const filePath = path.join(assetsDir, file);
        return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (candidates.length === 0) return next();

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.sendFile(candidates[0].filePath);
  });

  app.get('/assets/*', (req, res) => {
    res.status(404).type('text/plain').send('Asset not found');
  });

  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Async startup: initialize Turso DB then start server
async function main() {
  try {
    await setupDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();

module.exports = app;
