require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const KNOWN_API_PREFIXES = [
    '/api/auth',
    '/api/users',
    '/api/catalog',
    '/api/cart',
    '/api/orders',
    '/api/ratings',
    '/api/notifications'
];

const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Request Logging ─────────────────────────────────────────────────────────
app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
}));

// ── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        if (req.path === '/health') {
            return true;
        }

        const isKnownApiRoute = KNOWN_API_PREFIXES.some(prefix => req.path.startsWith(prefix));
        return isKnownApiRoute && ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    },
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ── Auth Middleware ─────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    // Public routes
    if (
        req.path.startsWith('/api/auth/register') ||
        req.path.startsWith('/api/auth/login') ||
        req.path.startsWith('/api/auth/forgot-password') ||
        req.path.startsWith('/api/auth/reset-password') ||
        (req.path.startsWith('/api/catalog') && req.method === 'GET') ||
        (req.path.startsWith('/api/ratings') && req.method === 'GET')
    ) {
        return next();
    }

    const isKnownApiRoute = KNOWN_API_PREFIXES.some(prefix => req.path.startsWith(prefix));
    if (!isKnownApiRoute) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-role'] = decoded.role || 'user';
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

app.use(authMiddleware);

// ── Proxy helper ─────────────────────────────────────────────────────────────
function makeProxy(target, pathRewrite) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite,
        on: {
            proxyReq: (proxyReq, req, res) => {
                logger.info(`Proxying ${req.method} ${req.originalUrl} to ${target}`);
            },
            error: (err, req, res) => {
                logger.error(`Proxy error to ${target}: ${err.message}`);
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Bad Gateway', message: 'Upstream service unavailable' });
                }
            }
        }
    });
}

// ── Routes ──────────────────────────────────────────────────────────────────
const USER_URL = process.env.USER_SERVICE_URL || 'http://user-service:3005';
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3001';
const CART_URL = process.env.CART_SERVICE_URL || 'http://cart-service:3006';
const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3002';
const RATING_URL = process.env.RATING_SERVICE_URL || 'http://rating-service:3003';
const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004';

app.use('/api/auth', makeProxy(USER_URL, { '^/': '/auth/' }));
app.use('/api/users', makeProxy(USER_URL, { '^/': '/users/' }));
app.use('/api/catalog', makeProxy(CATALOG_URL));
app.use('/api/cart', makeProxy(CART_URL));
app.use('/api/orders', makeProxy(ORDER_URL));
app.use('/api/ratings', makeProxy(RATING_URL));
app.use('/api/notifications', makeProxy(NOTIF_URL));

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
    app.listen(PORT, () => logger.info(`API Gateway running on port ${PORT}`));
}

module.exports = app;
