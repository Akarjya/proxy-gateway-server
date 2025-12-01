# 🌐 Web Proxy Gateway

A web proxy gateway that routes all traffic through 922proxy SOCKS5 proxies, making target websites see a US IP address instead of the visitor's real IP.

## 🚀 Quick Start

### Step 1: Rename Config File
```bash
# Rename config.env to .env
rename config.env .env
# OR on Linux/Mac
mv config.env .env
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Target Website
Edit `.env` file and change `TARGET_URL` to your WordPress site:
```env
TARGET_URL=https://your-wordpress-site.com
```

### Step 4: Run the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

### Step 5: Visit the Gateway
Open browser and go to: `http://localhost:3000`

## 📁 Project Structure

```
proxy-gateway/
├── src/
│   ├── config/config.js          # Configuration
│   ├── services/
│   │   ├── proxyService.js       # Proxy connection
│   │   ├── rewriteService.js     # URL rewriting
│   │   └── cookieService.js      # Cookie handling
│   ├── routes/
│   │   ├── landingRoutes.js      # Landing page
│   │   └── proxyRoutes.js        # Proxy routes
│   ├── utils/
│   │   ├── sessionIdGenerator.js # Session ID generator
│   │   └── logger.js             # Logging utility
│   ├── middleware/
│   │   └── errorMiddleware.js    # Error handling
│   └── app.js                    # Main application
├── views/
│   ├── landing.ejs               # Landing page
│   └── error.ejs                 # Error page
├── public/
│   ├── css/style.css             # Styles
│   └── js/main.js                # Client JS
├── config.env                    # Config (rename to .env)
└── package.json                  # Dependencies
```

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `TARGET_URL` | WordPress site to proxy | (required) |
| `PROXY_HOST` | 922proxy host | na.proxys5.net |
| `PROXY_PORT` | 922proxy port | 6200 |
| `PROXY_PASSWORD` | Proxy password | (required) |
| `SESSION_SECRET` | Session encryption key | (required) |

## 🔄 How It Works

1. User visits landing page → clicks "Proceed"
2. Server creates unique session with proxy ID
3. All requests routed through 922proxy (US IP)
4. Target website sees US proxy IP, not user's real IP
5. Sticky session ensures same IP throughout visit

## 🧪 Test Proxy IP

After clicking proceed, visit: `http://localhost:3000/test-ip`

This shows the IP that target websites will see.

## 📝 Changing Target Website

Edit `.env` file:
```env
TARGET_URL=https://new-website.com
```

Then restart the server.

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Proxy timeout | Check 922proxy credentials |
| Images not loading | Check browser console for errors |
| Session expired | Click proceed again |
| 502 errors | Proxy may be down, check logs |

## 📄 License

ISC

