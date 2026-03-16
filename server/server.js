require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('node:path');
const compression = require('compression'); // New optimization
const mongoSanitize = require('mongo-sanitize');
const xss = require('xss-clean');

// Import database connection
const { connectDB } = require('./config/database'); // <- CORRECCIÓN APLICADA AQUÍ

// Import routes
const authRoutes = require('./routes/auth');

const app = express();
app.set('trust proxy', 1); // Trust Nginx reverse proxy — needed for X-Forwarded-For (rate limiting, IP detection)
const PORT = process.env.PORT || 3000;

// ================================
// CORS — must be first, before Helmet
// ================================

const getAllowedOrigins = () => {
  const baseOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5500',
    // Production domains (HTTPS only)
    'https://odl-turquia.club',
    'https://www.odl-turquia.club',
    'https://chinese.odl-turquia.club'
  ];

  if (process.env.ALLOWED_ORIGINS) {
    const prodOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    return [...baseOrigins, ...prodOrigins];
  }

  return baseOrigins;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('⚠️  Blocked CORS request from unlisted origin.');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Handle preflight OPTIONS for ALL routes — must be before Helmet
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ================================
// SECURITY MIDDLEWARE
// ================================

// Security headers (after CORS so preflight isn't intercepted)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com", "https://tpc.googlesyndication.com", "https://*.adtrafficquality.google", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://accounts.google.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://pagead2.googlesyndication.com", "https://*.adtrafficquality.google", "https://cdn.jsdelivr.net", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com", "https://www.google.com", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));



// Rate limiting - General API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});

app.use('/api/', apiLimiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true
});

// Protect all auth entry points: login, register, google
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);

// Rate limiting for Analytics to prevent DB spam
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // More generous but still limited
  message: {
    error: 'Too many analytics events from this IP.'
  }
});

app.use('/api/analytics', analyticsLimiter);

// Data Sanitization against NoSQL query injection
app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
});

// Data Sanitization against XSS
app.use(xss());

// ================================
// GENERAL MIDDLEWARE
// ================================

// Logging - Different formats for dev/prod
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Compress all responses
app.use(compression());

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));


const FRONTEND_PATH = path.join(__dirname, '..', '_site');
app.use(express.static(FRONTEND_PATH, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('sw.js') || path.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
// ================================
// DATABASE CONNECTION
// ================================

// Connect to MongoDB using the config file
connectDB(); // Esto ahora funcionará

// ================================
// ROUTES
// ================================

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');

  res.json({
    status: 'OK',
    message: 'PandaLatam MVP Server is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

// API Routes 
app.use('/api/auth', authRoutes);
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/progress', require('./routes/progress')); // Progress Tracking
app.use('/api/chat', require('./routes/ai')); // AI Mascot Route
app.use('/api/notifications', require('./routes/notifications')); // Push Notifications
app.use('/api/analytics', require('./routes/analytics')); // Analytics Route (stops 404s)
app.use('/api/wod', require('./routes/wod')); // Word of the Day Stats

// API 404 handler - Must be after all API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/register',
        login: 'POST /api/login',
        logout: 'POST /api/logout',
        verify: 'GET /api/verify',
        profile: 'GET /api/profile',
        updateProfile: 'PUT /api/profile',
        streak: 'GET /api/streak',
        updateStreak: 'POST /api/update-streak'
      }
    },
    hint: 'Make sure you are using the correct HTTP method and endpoint'
  });
});

// Serve frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).json({
        error: 'Could not serve frontend application',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });
});

// ================================
// ERROR HANDLING
// ================================

// Global error handler
app.use((error, req, res, next) => {
  console.error(' Error:', error.message);

  // CORS errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
      hint: process.env.NODE_ENV === 'development'
        ? 'Make sure your origin is in the allowed list'
        : undefined
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please log in again'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Please log in again'
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      fields: error.errors ? Object.keys(error.errors) : undefined
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return res.status(400).json({
      error: 'Duplicate entry',
      message: field ? `${field} already exists` : 'Duplicate entry detected',
      field: field
    });
  }

  // Cast errors (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid data format',
      message: 'The provided ID or data format is invalid'
    });
  }

  // Default server error
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(' Uncaught Exception:', error);
  // Give time to log before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// ================================
// START SERVER
// ================================

const startServer = async () => {
  // Start listening immediately
  app.listen(PORT, () => {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   PandaLatam MVP Server Started   ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log(` Server (API): http://localhost:${PORT}`);
    console.log(` Health:       http://localhost:${PORT}/health`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` CORS: ${getAllowedOrigins().length} origins allowed`);
    console.log('\n Ready to accept connections!\n');
  });
};

startServer();


// ================================
// GRACEFUL SHUTDOWN
// ================================

/**
 * Handle graceful shutdown for nodemon restarts and process termination
 * This prevents "Connection reset by peer" errors in MongoDB logs
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connection
    const { closeDatabase } = require('./config/database');
    await closeDatabase();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle nodemon restart (SIGUSR2)
process.once('SIGUSR2', async () => {
  await gracefulShutdown('SIGUSR2');
  process.kill(process.pid, 'SIGUSR2');
});

// Handle Ctrl+C in terminal
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle termination signal
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;