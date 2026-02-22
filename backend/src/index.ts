/**
 * Main Server File
 * Express API + Background Worker (Miner Mode)
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from '@/db';
import jobRoutes from '@/routes/jobs';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// === MIDDLEWARE ===

// CORS configuration
const corsOptions = {
  origin: '*',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// === DATABASE CONNECTION ===

// Connect to MongoDB
connectDB();

// === ROUTES ===

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'production',
  });
});

// API routes
app.use('/api/jobs', jobRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// === ERROR HANDLING ===

app.use((error: any, req: Request, res: Response) => {
  console.error('Unhandled error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// === START SERVER ===

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
  POST /api/jobs                  - Add job (admin)
  GET  /health                    - Health check

═══════════════════════════════════════
  `);
});

// === GRACEFUL SHUTDOWN ===

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
