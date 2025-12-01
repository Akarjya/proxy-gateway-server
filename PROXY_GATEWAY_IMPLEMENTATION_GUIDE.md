# 🌐 Web Proxy Gateway - Complete Implementation Guide

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Deep Dive](#2-architecture-deep-dive)
3. [Prerequisites](#3-prerequisites)
4. [Project Setup](#4-project-setup)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Proxy Configuration](#7-proxy-configuration)
8. [URL Rewriting System](#8-url-rewriting-system)
9. [Cookie Handling](#9-cookie-handling)
10. [Error Handling & Retry Logic](#10-error-handling--retry-logic)
11. [Configuration Management](#11-configuration-management)
12. [Deployment Guide](#12-deployment-guide)
13. [Testing](#13-testing)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Project Overview

### 1.1 What We're Building

A **Web Proxy Gateway** that:
- Shows a simple landing page with a "Proceed" button
- When user clicks proceed, all subsequent requests go through a US proxy
- Target WordPress site sees the proxy IP (US), not the user's real IP
- Sticky sessions ensure same proxy IP throughout user's session

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Proxy Integration** | 922proxy SOCKS5 integration |
| **Sticky Sessions** | Same IP for entire user session |
| **URL Rewriting** | All links/resources routed through proxy |
| **Cookie Handling** | Session cookies managed server-side |
| **Auto Retry** | New proxy on failure |
| **Configurable Target** | Change target URL from backend |

### 1.3 Traffic Capacity

- Designed for: **2000-3000 daily visitors**
- Concurrent users: ~100-200 at peak

---

## 2. Architecture Deep Dive

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   USER      │
                                    │  BROWSER    │
                                    └──────┬──────┘
                                           │
                                           │ HTTPS
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           YOUR PROXY GATEWAY SERVER                           │
│                                                                               │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐       │
│  │  LANDING PAGE   │      │  PROXY ROUTER   │      │  URL REWRITER   │       │
│  │                 │      │                 │      │                 │       │
│  │  • Proceed Btn  │─────▶│  • Session Mgmt │─────▶│  • HTML Parse   │       │
│  │  • Session Init │      │  • Proxy Select │      │  • Link Rewrite │       │
│  │                 │      │  • SOCKS5 Conn  │      │  • Resource Fix │       │
│  └─────────────────┘      └─────────────────┘      └─────────────────┘       │
│                                    │                        │                 │
│                                    │                        │                 │
│  ┌─────────────────┐      ┌────────┴────────┐      ┌───────┴───────┐         │
│  │ CONFIG MANAGER  │      │ COOKIE HANDLER  │      │ ERROR HANDLER │         │
│  │                 │      │                 │      │               │         │
│  │ • Target URL    │      │ • Store cookies │      │ • Retry logic │         │
│  │ • Proxy creds   │      │ • Map to session│      │ • New proxy   │         │
│  └─────────────────┘      └─────────────────┘      └───────────────┘         │
│                                                                               │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │
                                        │ SOCKS5 (via 922proxy)
                                        │ US IP Address
                                        ▼
                              ┌─────────────────────┐
                              │   922PROXY.COM      │
                              │   SOCKS5 SERVER     │
                              │                     │
                              │   na.proxys5.net    │
                              │   Port: 6200        │
                              └──────────┬──────────┘
                                         │
                                         │ Appears as US IP
                                         ▼
                              ┌─────────────────────┐
                              │  TARGET WORDPRESS   │
                              │      WEBSITE        │
                              │                     │
                              │  Sees: US Proxy IP  │
                              │  NOT user's real IP │
                              └─────────────────────┘
```

### 2.2 Request Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                      │
└────────────────────────────────────────────────────────────────────────────┘

STEP 1: Initial Visit
═══════════════════════

    [User] ──────────────────▶ [Your Server: /]
                                     │
                                     ▼
                              ┌─────────────────┐
                              │  Landing Page   │
                              │                 │
                              │  [PROCEED BTN]  │
                              └─────────────────┘


STEP 2: User Clicks Proceed
════════════════════════════

    [User clicks PROCEED]
            │
            ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │                     SERVER PROCESSING                              │
    │                                                                    │
    │  1. Generate unique session ID                                     │
    │  2. Generate unique proxy session ID (for sticky IP)               │
    │  3. Store in user's session:                                       │
    │     - proxySessionId: "randomString123"                            │
    │     - startTime: timestamp                                         │
    │  4. Redirect to /browse (proxied content)                          │
    │                                                                    │
    └───────────────────────────────────────────────────────────────────┘
            │
            ▼
    [Redirect to /browse]


STEP 3: Proxied Browsing
════════════════════════

    [User requests /browse]
            │
            ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │                     SERVER PROCESSING                              │
    │                                                                    │
    │  1. Check session exists                                           │
    │  2. Build proxy connection string:                                 │
    │     socks5://username:password@na.proxys5.net:6200                │
    │     (username includes sessid for sticky IP)                       │
    │                                                                    │
    │  3. Fetch TARGET_URL through proxy                                 │
    │                                                                    │
    │  4. Rewrite all URLs in response:                                  │
    │     - href="https://target.com/page"                               │
    │       becomes                                                      │
    │       href="/browse/page"                                          │
    │                                                                    │
    │  5. Return modified HTML to user                                   │
    │                                                                    │
    └───────────────────────────────────────────────────────────────────┘
            │
            ▼
    [User sees WordPress site through proxy]


STEP 4: Subsequent Requests
════════════════════════════

    [User clicks any link on proxied page]
            │
            ▼
    [Request goes to /browse/path/to/page]
            │
            ▼
    [Server fetches target.com/path/to/page via SAME proxy IP]
            │
            ▼
    [Response rewritten and returned]

    *** SAME PROXY IP MAINTAINED THROUGHOUT SESSION ***
```

### 2.3 Proxy Session ID Mechanism

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    922PROXY STICKY SESSION MECHANISM                        │
└────────────────────────────────────────────────────────────────────────────┘

922proxy username format:
─────────────────────────
Ashish-zone-custom-region-US-sessid-{SESSION_ID}-sessTime-120

                                        ▲
                                        │
                                        │
                            This part makes IP sticky!
                            Same sessid = Same IP


Example:
────────
User A joins → Generate sessid: ABC123
User A's proxy username: Ashish-zone-custom-region-US-sessid-ABC123-sessTime-120
User A gets IP: 45.67.89.100

User A clicks around → Same sessid ABC123 used
User A continues to use IP: 45.67.89.100 ✅

─────────────────────────────────────────────────────────────────────────────

User B joins → Generate sessid: XYZ789
User B's proxy username: Ashish-zone-custom-region-US-sessid-XYZ789-sessTime-120
User B gets IP: 98.76.54.32 (DIFFERENT from User A)

─────────────────────────────────────────────────────────────────────────────

sessTime-120 means the sticky session lasts 120 minutes
After 120 min, same sessid may get different IP
```

---

## 3. Prerequisites

### 3.1 Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | Runtime |
| npm | 9.x or higher | Package manager |
| Git | Latest | Version control |

### 3.2 Required Accounts/Services

| Service | Status | Details |
|---------|--------|---------|
| 922proxy.com | ✅ Already have | SOCKS5 proxy service |
| VPS/Server | Need to setup | For hosting |
| Domain | Optional | Custom domain for gateway |

### 3.3 922proxy Credentials

```
API Key: c0ae40bb-4e8f-4fe6-8bf6-af1ca8b3b1fd
Proxy Host: na.proxys5.net
Proxy Port: 6200
Username Base: Ashish-zone-custom-region-US-sessid-{DYNAMIC}-sessTime-120
Password: Maahdev333
Protocol: SOCKS5
```

---

## 4. Project Setup

### 4.1 Directory Structure

```
proxy-gateway/
├── src/
│   ├── config/
│   │   └── config.js              # Configuration management
│   ├── middleware/
│   │   ├── sessionMiddleware.js   # Session handling
│   │   └── errorMiddleware.js     # Error handling
│   ├── services/
│   │   ├── proxyService.js        # Proxy connection logic
│   │   ├── rewriteService.js      # URL rewriting
│   │   └── cookieService.js       # Cookie handling
│   ├── routes/
│   │   ├── landingRoutes.js       # Landing page routes
│   │   └── proxyRoutes.js         # Proxy routes
│   ├── utils/
│   │   ├── sessionIdGenerator.js  # Generate unique IDs
│   │   └── logger.js              # Logging utility
│   └── app.js                     # Main application
├── public/
│   ├── css/
│   │   └── style.css              # Landing page styles
│   └── js/
│       └── main.js                # Landing page scripts
├── views/
│   ├── landing.ejs                # Landing page template
│   └── error.ejs                  # Error page template
├── .env                           # Environment variables
├── .env.example                   # Example env file
├── package.json                   # Dependencies
└── README.md                      # Project readme
```

### 4.2 Initialize Project

```bash
# Step 1: Create project directory
mkdir proxy-gateway
cd proxy-gateway

# Step 2: Initialize npm
npm init -y

# Step 3: Install dependencies
npm install express ejs express-session axios socks-proxy-agent cheerio uuid dotenv helmet morgan cookie-parser

# Step 4: Install dev dependencies
npm install --save-dev nodemon
```

### 4.3 Package.json Scripts

```json
{
  "name": "proxy-gateway",
  "version": "1.0.0",
  "description": "Web Proxy Gateway with 922proxy integration",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ejs": "^3.1.9",
    "express-session": "^1.17.3",
    "axios": "^1.6.0",
    "socks-proxy-agent": "^8.0.2",
    "cheerio": "^1.0.0-rc.12",
    "uuid": "^9.0.0",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "cookie-parser": "^1.4.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 5. Backend Implementation

### 5.1 Environment Configuration (.env)

```env
# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key-change-this

# Target Website Configuration
TARGET_URL=https://your-wordpress-site.com

# 922proxy Configuration
PROXY_HOST=na.proxys5.net
PROXY_PORT=6200
PROXY_USERNAME_BASE=Ashish-zone-custom-region-US
PROXY_PASSWORD=Maahdev333
PROXY_SESSION_TIME=120

# 922proxy API Key (for future use)
PROXY_API_KEY=c0ae40bb-4e8f-4fe6-8bf6-af1ca8b3b1fd
```

### 5.2 Configuration Manager (src/config/config.js)

```javascript
/**
 * Configuration Manager
 * Centralizes all configuration and makes it easy to change target URL
 */

require('dotenv').config();

const config = {
  // Server settings
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'change-this-secret'
  },

  // Target website - CHANGE THIS TO UPDATE TARGET
  target: {
    url: process.env.TARGET_URL || 'https://example.com',
    // Extract base domain for cookie handling
    get domain() {
      try {
        return new URL(this.url).hostname;
      } catch {
        return 'example.com';
      }
    }
  },

  // 922proxy settings
  proxy: {
    host: process.env.PROXY_HOST || 'na.proxys5.net',
    port: parseInt(process.env.PROXY_PORT) || 6200,
    usernameBase: process.env.PROXY_USERNAME_BASE || 'Ashish-zone-custom-region-US',
    password: process.env.PROXY_PASSWORD || 'Maahdev333',
    sessionTime: parseInt(process.env.PROXY_SESSION_TIME) || 120,
    apiKey: process.env.PROXY_API_KEY || '',

    /**
     * Build complete proxy username with session ID for sticky IP
     * @param {string} sessionId - Unique session identifier
     * @returns {string} Complete proxy username
     */
    buildUsername(sessionId) {
      return `${this.usernameBase}-sessid-${sessionId}-sessTime-${this.sessionTime}`;
    },

    /**
     * Get full proxy URL for socks-proxy-agent
     * @param {string} sessionId - Unique session identifier
     * @returns {string} Full SOCKS5 proxy URL
     */
    getProxyUrl(sessionId) {
      const username = this.buildUsername(sessionId);
      return `socks5://${username}:${this.password}@${this.host}:${this.port}`;
    }
  }
};

module.exports = config;
```

### 5.3 Session ID Generator (src/utils/sessionIdGenerator.js)

```javascript
/**
 * Session ID Generator
 * Generates unique session IDs for sticky proxy sessions
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique session ID for proxy sticky sessions
 * Format: 8 character alphanumeric string
 * @returns {string} Unique session ID
 */
function generateProxySessionId() {
  // Generate UUID and take first 8 characters (alphanumeric only)
  return uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
}

/**
 * Generate a random string of specified length
 * @param {number} length - Desired length
 * @returns {string} Random alphanumeric string
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  generateProxySessionId,
  generateRandomString
};
```

### 5.4 Logger Utility (src/utils/logger.js)

```javascript
/**
 * Simple Logger Utility
 */

const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },

  error: (message, error = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
    }
  }
};

module.exports = logger;
```

### 5.5 Proxy Service (src/services/proxyService.js)

```javascript
/**
 * Proxy Service
 * Handles all proxy-related operations including fetching content through proxy
 */

const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const config = require('../config/config');
const logger = require('../utils/logger');
const { generateProxySessionId } = require('../utils/sessionIdGenerator');

class ProxyService {
  /**
   * Create a SOCKS5 proxy agent for the given session
   * @param {string} proxySessionId - Unique proxy session ID
   * @returns {SocksProxyAgent} Configured proxy agent
   */
  createProxyAgent(proxySessionId) {
    const proxyUrl = config.proxy.getProxyUrl(proxySessionId);
    logger.debug('Creating proxy agent', { proxyUrl: proxyUrl.replace(config.proxy.password, '***') });
    
    return new SocksProxyAgent(proxyUrl);
  }

  /**
   * Fetch URL through proxy
   * @param {string} url - URL to fetch
   * @param {string} proxySessionId - Proxy session ID for sticky IP
   * @param {Object} options - Additional options (headers, cookies, etc.)
   * @returns {Promise<Object>} Response object with data, headers, status
   */
  async fetchThroughProxy(url, proxySessionId, options = {}) {
    const agent = this.createProxyAgent(proxySessionId);

    const axiosConfig = {
      url,
      method: options.method || 'GET',
      httpAgent: agent,
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      },
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept all non-5xx responses
      responseType: 'arraybuffer', // Handle binary data properly
      decompress: true
    };

    // Add cookies if provided
    if (options.cookies) {
      axiosConfig.headers['Cookie'] = options.cookies;
    }

    // Add request body for POST requests
    if (options.body) {
      axiosConfig.data = options.body;
    }

    try {
      logger.info('Fetching through proxy', { url, proxySessionId });
      const response = await axios(axiosConfig);

      return {
        success: true,
        status: response.status,
        headers: response.headers,
        data: response.data,
        contentType: response.headers['content-type'] || 'text/html'
      };
    } catch (error) {
      logger.error('Proxy fetch failed', { url, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch with retry logic - tries new proxy session on failure
   * @param {string} url - URL to fetch
   * @param {Object} session - Express session object
   * @param {Object} options - Additional options
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Response object
   */
  async fetchWithRetry(url, session, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchThroughProxy(url, session.proxySessionId, options);
        return response;
      } catch (error) {
        lastError = error;
        logger.warn(`Proxy attempt ${attempt} failed`, { url, error: error.message });

        // If not last attempt, generate new proxy session ID (new IP)
        if (attempt < maxRetries) {
          const newSessionId = generateProxySessionId();
          logger.info('Generating new proxy session', { 
            oldSessionId: session.proxySessionId, 
            newSessionId 
          });
          session.proxySessionId = newSessionId;
          
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // All retries failed
    throw new Error(`All ${maxRetries} proxy attempts failed: ${lastError.message}`);
  }
}

module.exports = new ProxyService();
```

### 5.6 URL Rewrite Service (src/services/rewriteService.js)

```javascript
/**
 * URL Rewrite Service
 * Rewrites all URLs in HTML content to go through the proxy gateway
 */

const cheerio = require('cheerio');
const config = require('../config/config');
const logger = require('../utils/logger');

class RewriteService {
  /**
   * Rewrite all URLs in HTML content
   * @param {string|Buffer} html - HTML content to rewrite
   * @param {string} baseUrl - Base URL of the target site
   * @returns {string} Rewritten HTML
   */
  rewriteHtml(html, baseUrl) {
    // Convert buffer to string if needed
    const htmlString = Buffer.isBuffer(html) ? html.toString('utf-8') : html;
    
    const $ = cheerio.load(htmlString, {
      decodeEntities: false
    });

    const targetDomain = new URL(baseUrl).origin;

    // Rewrite anchor tags (links)
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const newHref = this.rewriteUrl(href, targetDomain);
      if (newHref) {
        $(element).attr('href', newHref);
      }
    });

    // Rewrite image sources
    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite srcset for responsive images
    $('img[srcset], source[srcset]').each((_, element) => {
      const srcset = $(element).attr('srcset');
      const newSrcset = this.rewriteSrcset(srcset, targetDomain);
      if (newSrcset) {
        $(element).attr('srcset', newSrcset);
      }
    });

    // Rewrite stylesheets
    $('link[href]').each((_, element) => {
      const href = $(element).attr('href');
      const newHref = this.rewriteUrl(href, targetDomain);
      if (newHref) {
        $(element).attr('href', newHref);
      }
    });

    // Rewrite scripts
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite form actions
    $('form[action]').each((_, element) => {
      const action = $(element).attr('action');
      const newAction = this.rewriteUrl(action, targetDomain);
      if (newAction) {
        $(element).attr('action', newAction);
      }
    });

    // Rewrite video/audio sources
    $('video[src], audio[src], source[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite video poster
    $('video[poster]').each((_, element) => {
      const poster = $(element).attr('poster');
      const newPoster = this.rewriteUrl(poster, targetDomain);
      if (newPoster) {
        $(element).attr('poster', newPoster);
      }
    });

    // Rewrite object/embed
    $('object[data], embed[src]').each((_, element) => {
      const attr = $(element).attr('data') || $(element).attr('src');
      const newAttr = this.rewriteUrl(attr, targetDomain);
      if (newAttr) {
        if ($(element).attr('data')) {
          $(element).attr('data', newAttr);
        } else {
          $(element).attr('src', newAttr);
        }
      }
    });

    // Rewrite inline styles with url()
    $('[style]').each((_, element) => {
      const style = $(element).attr('style');
      const newStyle = this.rewriteInlineStyle(style, targetDomain);
      if (newStyle !== style) {
        $(element).attr('style', newStyle);
      }
    });

    // Rewrite meta refresh redirects
    $('meta[http-equiv="refresh"]').each((_, element) => {
      const content = $(element).attr('content');
      const newContent = this.rewriteMetaRefresh(content, targetDomain);
      if (newContent) {
        $(element).attr('content', newContent);
      }
    });

    return $.html();
  }

  /**
   * Rewrite a single URL
   * @param {string} url - Original URL
   * @param {string} targetDomain - Target domain origin
   * @returns {string|null} Rewritten URL or null if should not be rewritten
   */
  rewriteUrl(url, targetDomain) {
    if (!url) return null;

    // Skip data URIs, javascript:, mailto:, tel:, #anchors
    if (url.startsWith('data:') || 
        url.startsWith('javascript:') || 
        url.startsWith('mailto:') || 
        url.startsWith('tel:') ||
        url.startsWith('#')) {
      return null;
    }

    // Skip if already rewritten
    if (url.startsWith('/browse')) {
      return null;
    }

    let absoluteUrl;

    // Handle different URL formats
    if (url.startsWith('//')) {
      // Protocol-relative URL
      absoluteUrl = 'https:' + url;
    } else if (url.startsWith('/')) {
      // Absolute path
      absoluteUrl = targetDomain + url;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Already absolute
      absoluteUrl = url;
    } else {
      // Relative path - make it absolute
      absoluteUrl = targetDomain + '/' + url;
    }

    // Check if URL belongs to target domain or should be proxied
    try {
      const urlObj = new URL(absoluteUrl);
      const targetObj = new URL(targetDomain);

      // Only rewrite URLs from the same domain
      if (urlObj.hostname === targetObj.hostname) {
        return '/browse' + urlObj.pathname + urlObj.search + urlObj.hash;
      }

      // For external resources (CDNs, etc.), also proxy them
      // This ensures all requests go through our proxy
      return '/external/' + encodeURIComponent(absoluteUrl);

    } catch (error) {
      logger.warn('Failed to parse URL', { url, error: error.message });
      return null;
    }
  }

  /**
   * Rewrite srcset attribute
   * @param {string} srcset - Original srcset
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten srcset
   */
  rewriteSrcset(srcset, targetDomain) {
    if (!srcset) return null;

    return srcset.split(',').map(part => {
      const trimmed = part.trim();
      const [url, descriptor] = trimmed.split(/\s+/);
      const newUrl = this.rewriteUrl(url, targetDomain);
      return newUrl ? `${newUrl} ${descriptor || ''}`.trim() : trimmed;
    }).join(', ');
  }

  /**
   * Rewrite inline style url() references
   * @param {string} style - Inline style string
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten style
   */
  rewriteInlineStyle(style, targetDomain) {
    if (!style) return style;

    return style.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match, url) => {
      const newUrl = this.rewriteUrl(url, targetDomain);
      return newUrl ? `url('${newUrl}')` : match;
    });
  }

  /**
   * Rewrite meta refresh content
   * @param {string} content - Meta refresh content
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten content
   */
  rewriteMetaRefresh(content, targetDomain) {
    if (!content) return null;

    const match = content.match(/(\d+);\s*url=(.+)/i);
    if (match) {
      const [, delay, url] = match;
      const newUrl = this.rewriteUrl(url.trim(), targetDomain);
      if (newUrl) {
        return `${delay}; url=${newUrl}`;
      }
    }
    return null;
  }

  /**
   * Rewrite CSS content (for stylesheet responses)
   * @param {string} css - CSS content
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten CSS
   */
  rewriteCss(css, targetDomain) {
    if (!css) return css;

    // Convert buffer to string if needed
    const cssString = Buffer.isBuffer(css) ? css.toString('utf-8') : css;

    // Rewrite url() references in CSS
    return cssString.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match, url) => {
      const newUrl = this.rewriteUrl(url, targetDomain);
      return newUrl ? `url('${newUrl}')` : match;
    });
  }
}

module.exports = new RewriteService();
```

### 5.7 Cookie Service (src/services/cookieService.js)

```javascript
/**
 * Cookie Service
 * Handles cookie storage and mapping between target site and our proxy
 */

const config = require('../config/config');
const logger = require('../utils/logger');

class CookieService {
  /**
   * Extract cookies from response headers and store in session
   * @param {Object} responseHeaders - Response headers from target
   * @param {Object} session - Express session object
   */
  storeCookiesFromResponse(responseHeaders, session) {
    const setCookieHeaders = responseHeaders['set-cookie'];
    
    if (!setCookieHeaders) return;

    // Initialize cookie storage in session
    if (!session.targetCookies) {
      session.targetCookies = {};
    }

    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    cookies.forEach(cookieStr => {
      try {
        const parsed = this.parseCookie(cookieStr);
        if (parsed) {
          session.targetCookies[parsed.name] = parsed.value;
          logger.debug('Stored cookie', { name: parsed.name });
        }
      } catch (error) {
        logger.warn('Failed to parse cookie', { cookie: cookieStr, error: error.message });
      }
    });
  }

  /**
   * Parse a Set-Cookie header string
   * @param {string} cookieStr - Cookie string
   * @returns {Object|null} Parsed cookie with name and value
   */
  parseCookie(cookieStr) {
    const parts = cookieStr.split(';');
    const [nameValue] = parts;
    
    if (!nameValue) return null;

    const [name, ...valueParts] = nameValue.split('=');
    const value = valueParts.join('='); // Handle values with = in them

    if (!name) return null;

    return {
      name: name.trim(),
      value: value ? value.trim() : ''
    };
  }

  /**
   * Build Cookie header from stored cookies
   * @param {Object} session - Express session object
   * @returns {string} Cookie header value
   */
  buildCookieHeader(session) {
    if (!session.targetCookies || Object.keys(session.targetCookies).length === 0) {
      return '';
    }

    return Object.entries(session.targetCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Clear all stored cookies for a session
   * @param {Object} session - Express session object
   */
  clearCookies(session) {
    session.targetCookies = {};
    logger.debug('Cleared session cookies');
  }
}

module.exports = new CookieService();
```

### 5.8 Landing Routes (src/routes/landingRoutes.js)

```javascript
/**
 * Landing Page Routes
 * Handles the initial landing page and proceed action
 */

const express = require('express');
const router = express.Router();
const { generateProxySessionId } = require('../utils/sessionIdGenerator');
const logger = require('../utils/logger');

/**
 * GET /
 * Display landing page with proceed button
 */
router.get('/', (req, res) => {
  // If already has valid session, redirect to browse
  if (req.session.proxySessionId && req.session.isActive) {
    return res.redirect('/browse');
  }

  res.render('landing', {
    title: 'Welcome'
  });
});

/**
 * POST /proceed
 * Initialize proxy session and redirect to browse
 */
router.post('/proceed', (req, res) => {
  try {
    // Generate unique proxy session ID for sticky IP
    const proxySessionId = generateProxySessionId();

    // Store in session
    req.session.proxySessionId = proxySessionId;
    req.session.isActive = true;
    req.session.startTime = Date.now();
    req.session.targetCookies = {};

    logger.info('New proxy session initialized', { 
      proxySessionId,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Redirect to proxied content
    res.redirect('/browse');

  } catch (error) {
    logger.error('Failed to initialize session', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to initialize session. Please try again.'
    });
  }
});

/**
 * GET /reset
 * Reset session and return to landing page
 */
router.get('/reset', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Failed to destroy session', { error: err.message });
    }
    res.redirect('/');
  });
});

module.exports = router;
```

### 5.9 Proxy Routes (src/routes/proxyRoutes.js)

```javascript
/**
 * Proxy Routes
 * Handles all proxied content requests
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const proxyService = require('../services/proxyService');
const rewriteService = require('../services/rewriteService');
const cookieService = require('../services/cookieService');
const logger = require('../utils/logger');

/**
 * Middleware to check for valid proxy session
 */
const requireProxySession = (req, res, next) => {
  if (!req.session.proxySessionId || !req.session.isActive) {
    logger.warn('No valid proxy session', { path: req.path });
    return res.redirect('/');
  }
  next();
};

// Apply session check to all proxy routes
router.use(requireProxySession);

/**
 * GET /browse/*
 * Proxy requests to target site
 */
router.get('/browse*', async (req, res) => {
  try {
    // Extract path after /browse
    let targetPath = req.path.replace('/browse', '') || '/';
    
    // Preserve query string
    if (req.query && Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      targetPath += '?' + queryString;
    }

    // Build full target URL
    const targetUrl = config.target.url + targetPath;

    logger.info('Proxying request', { 
      targetUrl,
      proxySessionId: req.session.proxySessionId 
    });

    // Get stored cookies for target site
    const cookies = cookieService.buildCookieHeader(req.session);

    // Fetch through proxy with retry
    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      {
        method: 'GET',
        cookies,
        headers: {
          'Referer': config.target.url
        }
      }
    );

    // Store any cookies from response
    cookieService.storeCookiesFromResponse(response.headers, req.session);

    // Determine content type
    const contentType = response.contentType;

    // Handle different content types
    if (contentType.includes('text/html')) {
      // Rewrite HTML
      const rewrittenHtml = rewriteService.rewriteHtml(response.data, config.target.url);
      res.type('text/html').send(rewrittenHtml);

    } else if (contentType.includes('text/css')) {
      // Rewrite CSS
      const rewrittenCss = rewriteService.rewriteCss(response.data, config.target.url);
      res.type('text/css').send(rewrittenCss);

    } else {
      // Pass through other content types (images, fonts, JS, etc.)
      res.type(contentType).send(response.data);
    }

  } catch (error) {
    logger.error('Proxy request failed', { 
      path: req.path, 
      error: error.message 
    });

    res.status(502).render('error', {
      title: 'Proxy Error',
      message: 'Unable to load the requested page. Please try again.'
    });
  }
});

/**
 * POST /browse/*
 * Handle POST requests to target site (forms, etc.)
 */
router.post('/browse*', async (req, res) => {
  try {
    let targetPath = req.path.replace('/browse', '') || '/';
    const targetUrl = config.target.url + targetPath;

    logger.info('Proxying POST request', { targetUrl });

    const cookies = cookieService.buildCookieHeader(req.session);

    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      {
        method: 'POST',
        cookies,
        body: req.body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
          'Referer': config.target.url
        }
      }
    );

    cookieService.storeCookiesFromResponse(response.headers, req.session);

    const contentType = response.contentType;

    if (contentType.includes('text/html')) {
      const rewrittenHtml = rewriteService.rewriteHtml(response.data, config.target.url);
      res.type('text/html').send(rewrittenHtml);
    } else {
      res.type(contentType).send(response.data);
    }

  } catch (error) {
    logger.error('POST proxy failed', { error: error.message });
    res.status(502).render('error', {
      title: 'Proxy Error',
      message: 'Form submission failed. Please try again.'
    });
  }
});

/**
 * GET /external/*
 * Proxy external resources (CDNs, third-party assets)
 */
router.get('/external/:encodedUrl', async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.encodedUrl);

    logger.debug('Proxying external resource', { targetUrl });

    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      { method: 'GET' }
    );

    const contentType = response.contentType;

    // For CSS, rewrite URLs
    if (contentType.includes('text/css')) {
      // External CSS might reference relative URLs, handle them
      const rewrittenCss = rewriteService.rewriteCss(response.data, targetUrl);
      res.type('text/css').send(rewrittenCss);
    } else {
      res.type(contentType).send(response.data);
    }

  } catch (error) {
    logger.error('External resource fetch failed', { error: error.message });
    res.status(404).send('Resource not found');
  }
});

module.exports = router;
```

### 5.10 Error Middleware (src/middleware/errorMiddleware.js)

```javascript
/**
 * Error Handling Middleware
 */

const logger = require('../utils/logger');

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you requested was not found.'
  });
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path 
  });

  res.status(500).render('error', {
    title: 'Server Error',
    message: 'An unexpected error occurred. Please try again later.'
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
```

### 5.11 Main Application (src/app.js)

```javascript
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

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
});

module.exports = app;
```

---

## 6. Frontend Implementation

### 6.1 Landing Page Template (views/landing.ejs)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="card-content">
        <h1>Welcome</h1>
        <p>Click the button below to proceed</p>
        
        <form action="/proceed" method="POST">
          <button type="submit" class="proceed-btn">
            <span>PROCEED</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</body>
</html>
```

### 6.2 Error Page Template (views/error.ejs)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container">
    <div class="card error-card">
      <div class="card-content">
        <div class="error-icon">⚠️</div>
        <h1><%= title %></h1>
        <p><%= message %></p>
        
        <a href="/" class="proceed-btn">
          <span>Go Back</span>
        </a>
      </div>
    </div>
  </div>
</body>
</html>
```

### 6.3 Styles (public/css/style.css)

```css
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --background: #0f172a;
  --card-bg: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-color: #334155;
  --success-color: #22c55e;
  --error-color: #ef4444;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: var(--background);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

/* Background Pattern */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

.container {
  width: 100%;
  max-width: 480px;
  padding: 20px;
}

/* Card Styles */
.card {
  background: var(--card-bg);
  border-radius: 24px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.card-content {
  padding: 60px 40px;
  text-align: center;
}

.card h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card p {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 40px;
  line-height: 1.6;
}

/* Proceed Button */
.proceed-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 18px 48px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.proceed-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s ease;
}

.proceed-btn:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 20px 40px -15px rgba(99, 102, 241, 0.5),
    0 0 20px rgba(99, 102, 241, 0.3);
}

.proceed-btn:hover::before {
  left: 100%;
}

.proceed-btn:active {
  transform: translateY(0);
}

.proceed-btn svg {
  transition: transform 0.3s ease;
}

.proceed-btn:hover svg {
  transform: translateX(4px);
}

/* Error Card Styles */
.error-card {
  border-color: rgba(239, 68, 68, 0.3);
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.error-card h1 {
  background: linear-gradient(135deg, var(--error-color) 0%, #f87171 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Loading State */
.proceed-btn.loading {
  pointer-events: none;
  opacity: 0.7;
}

.proceed-btn.loading span {
  opacity: 0;
}

.proceed-btn.loading::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  border: 3px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 480px) {
  .card-content {
    padding: 40px 24px;
  }

  .card h1 {
    font-size: 2rem;
  }

  .proceed-btn {
    padding: 16px 36px;
    font-size: 1rem;
  }
}
```

### 6.4 JavaScript (public/js/main.js)

```javascript
/**
 * Landing Page JavaScript
 * Handles button loading state
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  const button = document.querySelector('.proceed-btn');

  if (form && button) {
    form.addEventListener('submit', function() {
      // Add loading state
      button.classList.add('loading');
      button.disabled = true;
    });
  }
});
```

---

## 7. Proxy Configuration

### 7.1 922proxy Configuration Explained

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        922PROXY CONFIGURATION                                │
└─────────────────────────────────────────────────────────────────────────────┘

Connection Details:
───────────────────
Host: na.proxys5.net
Port: 6200
Protocol: SOCKS5

Username Format:
────────────────
Ashish-zone-custom-region-US-sessid-{SESSION_ID}-sessTime-120

Parts breakdown:
├── Ashish          → Account identifier
├── zone-custom     → Zone type (custom)
├── region-US       → Geographic region (United States)
├── sessid-{ID}     → Session ID for sticky IP (we generate this)
└── sessTime-120    → Session duration in minutes (120 = 2 hours)

Password: Maahdev333

Full Proxy URL Format:
──────────────────────
socks5://Ashish-zone-custom-region-US-sessid-ABC123-sessTime-120:Maahdev333@na.proxys5.net:6200
```

### 7.2 How Sticky Sessions Work

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STICKY SESSION FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

When User A arrives:
────────────────────
1. Generate random session ID: "A1B2C3D4"
2. Build username: Ashish-zone-custom-region-US-sessid-A1B2C3D4-sessTime-120
3. First request through this username → 922proxy assigns IP: 192.168.1.100
4. All subsequent requests with same sessid → Same IP: 192.168.1.100

After 120 minutes:
──────────────────
- Session expires at 922proxy's end
- Next request may get different IP
- Our session timeout (2 hours) aligns with this

If proxy fails:
───────────────
1. Catch the error
2. Generate NEW session ID: "E5F6G7H8"
3. Retry request → Gets new IP: 10.20.30.40
4. Update session with new ID
5. Continue with new sticky IP
```

---

## 8. URL Rewriting System

### 8.1 What Gets Rewritten

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        URL REWRITING EXAMPLES                                │
└─────────────────────────────────────────────────────────────────────────────┘

HTML Elements Rewritten:
────────────────────────

1. Links (anchor tags):
   Before: <a href="https://target.com/about">About</a>
   After:  <a href="/browse/about">About</a>

2. Images:
   Before: <img src="https://target.com/image.jpg">
   After:  <img src="/browse/image.jpg">

3. Stylesheets:
   Before: <link href="https://target.com/style.css">
   After:  <link href="/browse/style.css">

4. Scripts:
   Before: <script src="https://target.com/app.js">
   After:  <script src="/browse/app.js">

5. Forms:
   Before: <form action="https://target.com/submit">
   After:  <form action="/browse/submit">

6. External Resources (CDNs):
   Before: <script src="https://cdn.example.com/lib.js">
   After:  <script src="/external/https%3A%2F%2Fcdn.example.com%2Flib.js">

NOT Rewritten:
──────────────
- data: URIs
- javascript: links
- mailto: links
- tel: links
- # anchor links
```

### 8.2 URL Transformation Logic

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        URL TRANSFORMATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

Input URL Types:

1. Absolute URL (same domain):
   Input:  https://target.com/page/subpage
   Output: /browse/page/subpage

2. Relative Path:
   Input:  /page/subpage
   Output: /browse/page/subpage

3. Relative URL:
   Input:  page/subpage
   Output: /browse/page/subpage

4. Protocol-relative:
   Input:  //target.com/page
   Output: /browse/page

5. External URL:
   Input:  https://external-cdn.com/resource.js
   Output: /external/https%3A%2F%2Fexternal-cdn.com%2Fresource.js
```

---

## 9. Cookie Handling

### 9.1 Cookie Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COOKIE HANDLING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: User visits /browse
─────────────────────────────
Server fetches target.com
Target responds with: Set-Cookie: session_id=abc123; Domain=target.com

Step 2: Server stores cookie
────────────────────────────
req.session.targetCookies = {
  'session_id': 'abc123'
}

Step 3: User clicks link to /browse/another-page
─────────────────────────────────────────────────
Server reads stored cookies
Adds to outgoing request: Cookie: session_id=abc123
Target sees the cookie → Maintains session

Step 4: Target sends more cookies
──────────────────────────────────
Set-Cookie: preferences=dark; Domain=target.com
Server adds to storage:
req.session.targetCookies = {
  'session_id': 'abc123',
  'preferences': 'dark'
}

Result: Target site's session maintained through our proxy!
```

---

## 10. Error Handling & Retry Logic

### 10.1 Retry Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RETRY LOGIC FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  Request Starts  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Attempt 1        │
                    │ Using sessid:    │
                    │ ABC123           │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
        ┌──────────┐                 ┌──────────────┐
        │ Success  │                 │    Fail      │
        └────┬─────┘                 └──────┬───────┘
             │                              │
             ▼                              ▼
      ┌────────────┐               ┌──────────────────┐
      │  Return    │               │ Generate new     │
      │  Response  │               │ sessid: XYZ789   │
      └────────────┘               │ Wait 1 second    │
                                   └────────┬─────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │ Attempt 2        │
                                   │ Using sessid:    │
                                   │ XYZ789           │
                                   └────────┬─────────┘
                                            │
                             ┌──────────────┴──────────────┐
                             │                             │
                             ▼                             ▼
                       ┌──────────┐                 ┌──────────────┐
                       │ Success  │                 │    Fail      │
                       └────┬─────┘                 └──────┬───────┘
                            │                              │
                            ▼                              ▼
                     ┌────────────┐               ┌──────────────────┐
                     │  Return    │               │ Attempt 3        │
                     │  Response  │               │ (last attempt)   │
                     └────────────┘               └────────┬─────────┘
                                                          │
                                           ┌──────────────┴──────────────┐
                                           │                             │
                                           ▼                             ▼
                                     ┌──────────┐                 ┌──────────────┐
                                     │ Success  │                 │  All Failed  │
                                     └────┬─────┘                 └──────┬───────┘
                                          │                              │
                                          ▼                              ▼
                                   ┌────────────┐               ┌──────────────────┐
                                   │  Return    │               │  Return Error    │
                                   │  Response  │               │  Page to User    │
                                   └────────────┘               └──────────────────┘
```

---

## 11. Configuration Management

### 11.1 Changing Target URL

To change the target website, update the `.env` file:

```env
# Before
TARGET_URL=https://old-wordpress-site.com

# After
TARGET_URL=https://new-wordpress-site.com
```

Then restart the server:

```bash
# If using PM2
pm2 restart proxy-gateway

# If running directly
# Stop current process (Ctrl+C) and restart
npm start
```

### 11.2 Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `SESSION_SECRET` | Secret for session encryption | (required) |
| `TARGET_URL` | WordPress site URL to proxy | (required) |
| `PROXY_HOST` | 922proxy host | na.proxys5.net |
| `PROXY_PORT` | 922proxy port | 6200 |
| `PROXY_USERNAME_BASE` | Username prefix | Ashish-zone-custom-region-US |
| `PROXY_PASSWORD` | Proxy password | (required) |
| `PROXY_SESSION_TIME` | Sticky session duration (minutes) | 120 |
| `PROXY_API_KEY` | 922proxy API key | (optional) |

---

## 12. Deployment Guide

### 12.1 VPS Setup (Ubuntu/Debian)

```bash
# Step 1: Update system
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Step 3: Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x

# Step 4: Install PM2 (process manager)
sudo npm install -g pm2

# Step 5: Clone/upload your project
cd /var/www
git clone <your-repo> proxy-gateway
# OR upload files via SFTP

# Step 6: Install dependencies
cd proxy-gateway
npm install

# Step 7: Create .env file
cp .env.example .env
nano .env  # Edit with your values

# Step 8: Start with PM2
pm2 start src/app.js --name proxy-gateway

# Step 9: Save PM2 config (auto-start on reboot)
pm2 save
pm2 startup
```

### 12.2 Nginx Reverse Proxy (Optional but Recommended)

```nginx
# /etc/nginx/sites-available/proxy-gateway

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for proxy
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/proxy-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 12.3 SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### 12.4 PM2 Commands Reference

```bash
# View logs
pm2 logs proxy-gateway

# Restart application
pm2 restart proxy-gateway

# Stop application
pm2 stop proxy-gateway

# Monitor resources
pm2 monit

# View status
pm2 status
```

---

## 13. Testing

### 13.1 Test Checklist

| Test | How to Verify | Expected Result |
|------|---------------|-----------------|
| Landing page loads | Visit http://localhost:3000 | See proceed button |
| Session creates | Click proceed | Redirected to /browse |
| Target loads | Check /browse content | WordPress site visible |
| Links work | Click any link | Stays on /browse/* paths |
| Images load | Check images | All images visible |
| CSS loads | Check styling | Proper styling |
| Proxy IP used | Check target's access log | Shows 922proxy IP, not yours |
| Retry works | Disconnect proxy temporarily | Auto-retries with new session |
| Session persists | Navigate multiple pages | Same proxy IP used |

### 13.2 Verify Proxy IP

You can add a test route to verify proxy IP:

```javascript
// Add to proxyRoutes.js for testing

router.get('/test-ip', async (req, res) => {
  try {
    // Fetch IP checking service through proxy
    const response = await proxyService.fetchWithRetry(
      'https://api.ipify.org?format=json',
      req.session
    );
    
    const data = JSON.parse(response.data.toString());
    res.json({
      proxyIp: data.ip,
      proxySessionId: req.session.proxySessionId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 14. Troubleshooting

### 14.1 Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Proxy connection timeout | 922proxy server issue | Check proxy credentials, try different port |
| Target site not loading | URL rewriting issue | Check browser console, verify target URL |
| Session not persisting | Cookie configuration | Check session secret, cookie settings |
| Images broken | Relative URL issue | Check rewrite logic for image paths |
| CSS not loading | Content-type detection | Verify CSS content-type handling |
| 502 errors | Proxy failure | Check logs, verify proxy is active |

### 14.2 Debug Mode

Enable debug logging:

```env
# .env
NODE_ENV=development
```

### 14.3 Checking Logs

```bash
# PM2 logs
pm2 logs proxy-gateway --lines 100

# Real-time logs
pm2 logs proxy-gateway --raw
```

---

## 📌 Quick Start Summary

```bash
# 1. Setup project
mkdir proxy-gateway && cd proxy-gateway
npm init -y
npm install express ejs express-session axios socks-proxy-agent cheerio uuid dotenv helmet morgan cookie-parser

# 2. Create all files as shown above

# 3. Configure .env
TARGET_URL=https://your-wordpress-site.com
SESSION_SECRET=your-random-secret-key
# ... other values

# 4. Run
npm start

# 5. Visit http://localhost:3000
# 6. Click Proceed
# 7. You're now browsing through US proxy!
```

---

## 🎯 Summary

This guide provides a complete implementation of a Web Proxy Gateway that:

✅ Shows a simple landing page with proceed button
✅ Routes all traffic through 922proxy (US SOCKS5)
✅ Uses sticky sessions (same IP for user's entire session)
✅ Rewrites all URLs to go through the proxy
✅ Handles cookies properly
✅ Auto-retries with new proxy on failure
✅ Easy target URL change via config

**Happy Proxying! 🚀**

