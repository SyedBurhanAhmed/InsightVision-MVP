require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDb } = require('./config/db');

const authRoutes = require('./routes/auth');
const detectionRoutes = require('./routes/detections');
const queryRoutes = require('./routes/queries');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'insightvision-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err, _req, res, _next) => {
  console.error('unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await connectDb();
  app.listen(port, '0.0.0.0', () => {
    console.log(`InsightVision API listening on http://0.0.0.0:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
