require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const inspectionsRoutes = require('./routes/inspections.routes');
const imagesRoutes = require('./routes/images.routes');
const analysisRoutes = require('./routes/analysis.routes');
const complianceRoutes = require('./routes/compliance.routes');
const violationsRoutes = require('./routes/violations.routes');
const rulesRoutes = require('./routes/rules.routes');
const reportsRoutes = require('./routes/reports.routes');
const reportDownloadRoutes = require('./routes/reportDownload.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}. Check .env against .env.example.`);
    process.exit(1);
  }
}

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false })); // disabled so /uploads images render in the frontend
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Uploaded images are served statically so they can be used directly as
// <img src> in the UI (a plain <img> tag can't attach a Bearer token, so
// this can't sit behind requireAuth the way the JSON API does). Filenames
// are randomized (crypto random suffix, see middleware/upload.js) so they
// aren't enumerable. For a real deployment, swap this for short-lived
// signed URLs from cloud storage (Supabase Storage / S3) instead.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/inspections', imagesRoutes);
app.use('/api/inspections', analysisRoutes);
app.use('/api/inspections', complianceRoutes);
app.use('/api/inspections', reportsRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/reports', reportDownloadRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing backend or start this process with another PORT.`);
    process.exit(1);
  }
  console.error('Backend server failed to start:', err.message);
  process.exit(1);
});

module.exports = app;
