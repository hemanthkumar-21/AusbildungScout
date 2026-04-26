/**
 * Main Server File
 * Express API + Background Worker (Miner Mode)
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from '@/db';
import jobRoutes from '@/routes/jobs';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

connectDB();

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'production',
  });
});

app.use('/api/jobs', jobRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use((error: any, req: Request, res: Response) => {
  console.error('Unhandled error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   AusbildungScout Backend Server      ║
╚═══════════════════════════════════════╝

📡 Server running on: http://localhost:${PORT}
🌍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
📊 Database: ${process.env.MONGO_URI ? '✓ Connected' : '✗ Not configured'}
🎯 Mode: ${process.env.DEMO_MODE === 'true' ? '🎭 DEMO' : '🚀 PRODUCTION'}

Available Routes:
  GET  /api/jobs                   - List jobs (with filters)
  GET  /api/jobs/search?q=<term>  - Full-text search
  GET  /api/jobs/:id              - Get single job
  GET  /api/jobs/stats            - Market statistics
  GET  /health                    - Health check

═══════════════════════════════════════
  `);
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
