require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { initSchema } = require('./db');
const cakeRoutes = require('./routes/cakes');
const logger = require('./logger');

const app = express();
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() })
);

app.use('/cakes', cakeRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, _next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;

const start = async () => {
    if (process.env.NODE_ENV !== 'test') {
        await initSchema();
        logger.info('MySQL connected');
        app.listen(PORT, () => logger.info(`Catalog Service running on port ${PORT}`));
    }
};

start().catch(err => {
    logger.error('Startup error', err);
    process.exit(1);
});

module.exports = app;
