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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply CORS only to /api routes
// For same-origin requests (Origin matches Host), skip CORS check entirely.
// Modern browsers send Origin on same-origin POST requests, which would otherwise be rejected.
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Same-origin: no CORS headers needed, just proceed
  if (!origin || (host && origin.endsWith(host))) {
    return next();
  }

  // Cross-origin: apply CORS policy
  cors(corsOptions)(req, res, next);
});
app.options('/api/*', cors(corsOptions));

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
app.use('/api/landing-pages', require('./routes/landingPages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin auth — validates password against server-side ADMIN_PASSWORD env var
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ success: false, error: 'Admin password not configured on server.' });
  }
  if (password === adminPassword) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Invalid password.' });
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
  // Serve all static assets (JS, CSS, images, etc.)
  app.use(express.static(clientDist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return;
      }
      // Cache hashed assets forever
      if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // SPA fallback — all non-API, non-asset routes serve index.html
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
