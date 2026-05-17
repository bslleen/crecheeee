import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import helmet             from 'helmet';
import cors               from 'cors';
import { rateLimit }      from 'express-rate-limit';

import authRoutes      from './routes/authRoutes.js';
import protectedRoutes from './routes/protectedRoutes.js';
import userRoutes      from './routes/userRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  PORT        = '3000',
  NODE_ENV    = 'development',
  CORS_ORIGIN = 'http://localhost:3000',
} = process.env;

const app = express();

// =============================================================================
// Security middleware
// =============================================================================

app.use(helmet());

app.use(cors({
  origin:         CORS_ORIGIN.split(',').map(o => o.trim()),
  methods:        ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

// =============================================================================
// Body parsing
// =============================================================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// =============================================================================
// Development request logger
// =============================================================================

if (NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// =============================================================================
// Rate limiters
// =============================================================================

// Strict limiter for auth endpoints — prevents brute-force and credential stuffing.
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests from this IP. Please try again in 15 minutes.' },
});

// General API limiter for protected endpoints.
const apiLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            500,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: 'Too many requests from this IP. Please try again in 15 minutes.' },
});

// =============================================================================
// Health check (no rate limit — used by load balancers)
// =============================================================================

app.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'IDMS Module 1 — User & Access Management',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// Static files and API routers
// =============================================================================

app.use(express.static(join(__dirname, '..', 'public')));

app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/admin/users',  apiLimiter,  userRoutes);
app.use('/api',              apiLimiter,  protectedRoutes);

// =============================================================================
// 404 catch-all
// =============================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found.`,
  });
});

// =============================================================================
// Global error handler
// =============================================================================

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[App] Unhandled error:', err);
  const detail = NODE_ENV === 'development' ? err.stack : undefined;
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    ...(detail && { detail }),
  });
});

// =============================================================================
// Server startup
// =============================================================================

const server = app.listen(PORT, () => {
  console.info(`
╔══════════════════════════════════════════════════════╗
║   IDMS — Module 1: User & Access Management          ║
║   Server running on http://localhost:${String(PORT).padEnd(5)}            ║
║   Environment: ${String(NODE_ENV).padEnd(36)}║
╚══════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.info('[App] SIGTERM received — shutting down gracefully.');
  server.close(() => { console.info('[App] HTTP server closed.'); process.exit(0); });
});

process.on('SIGINT', () => {
  console.info('[App] SIGINT received — shutting down gracefully.');
  server.close(() => { console.info('[App] HTTP server closed.'); process.exit(0); });
});

export { app, server };
export default app;
