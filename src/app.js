/**
 * Main Application Entry Point
 * atolf.xyz - Dating & Relationship Tips Blog
 * 
 * Architecture:
 * - /       → Homepage (blog posts list)
 * - /loader → Loader page (activates Service Worker)
 * - /post/* → Individual blog posts
 * - /about, /contact, /privacy → Policy pages
 * - /relay  → Service Worker relay endpoint
 */

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config/config');
const logger = require('./utils/logger');
const landingRoutes = require('./routes/landingRoutes');
const contentRoutes = require('./routes/contentRoutes');
const relayRoutes = require('./routes/relayRoutes');
const navigateRoutes = require('./routes/navigateRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Initialize Express app
const app = express();

// Trust proxy (if behind nginx/load balancer)
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Security middleware (with modifications for proxy/SW)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for SW and external content
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// Logging
app.use(morgan('combined'));

// Body parsing (increased limit for relay requests)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files with proper headers for SW
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    // Service Worker needs special scope header
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Session configuration
app.use(session({
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: true, // Changed to true for SW relay requests
  cookie: {
    secure: config.server.env === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// ==========================================
// ROUTES
// ==========================================

// Relay routes (must be first for SW requests)
app.use('/', relayRoutes);

// Navigate routes (external URL handler)
app.use('/', navigateRoutes);

// Landing/Loader routes (/loader, /reset, etc.)
app.use('/', landingRoutes);

// Content routes (homepage, posts, policy pages)
app.use('/', contentRoutes);

// ==========================================
// ERROR HANDLERS
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// START SERVER
// ==========================================

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`🚀 Proxy Gateway started`, {
    port: PORT,
    environment: config.server.env
  });
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   💕 atolf.xyz - Dating & Relationship Tips                    ║
║                                                                ║
║   Server running at: http://localhost:${PORT}                    ║
║                                                                ║
║   Routes:                                                      ║
║   • /          → Homepage (blog posts)                         ║
║   • /loader    → Loader (SW activation)                        ║
║   • /post/*    → Individual blog posts                         ║
║   • /about     → About page                                    ║
║   • /contact   → Contact page                                  ║
║   • /privacy   → Privacy policy                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
