/**
 * Main Application Entry Point
 * Web Proxy Gateway with 922proxy Integration
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
const proxyRoutes = require('./routes/proxyRoutes');
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

// Security middleware (with modifications for proxy)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP as we're proxying external content
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Logging
app.use(morgan('combined'));

// Body parsing (increased limit for relay requests)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.server.env === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  }
}));

// Routes
app.use('/', landingRoutes);
app.use('/', relayRoutes);  // Service Worker relay routes (must be before proxyRoutes)
app.use('/', navigateRoutes);  // External navigation routes (for ad clicks, external links)
app.use('/', proxyRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`🚀 Proxy Gateway started`, {
    port: PORT,
    environment: config.server.env,
    targetUrl: config.target.url
  });
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`📌 Target website: ${config.target.url}`);
  console.log(`🌐 Proxy: ${config.proxy.host}:${config.proxy.port}\n`);
});

module.exports = app;

