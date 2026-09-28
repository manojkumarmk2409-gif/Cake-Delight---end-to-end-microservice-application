require('dotenv').config();
const express = require('express');
const { initSchema } = require('./db');
const notificationRoutes = require('./routes/notifications');
const { startConsumer } = require('./rabbitmq/consumer');
const logger = require('./logger');

const app = express();
app.use(express.json());

app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() })
);

app.use('/', notificationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3004;

const start = async () => {
    if (process.env.NODE_ENV !== 'test') {
        await initSchema();
        logger.info('MySQL connected');
        await startConsumer();
        app.listen(PORT, () => logger.info(`Notification Service running on port ${PORT}`));
    }
};

start().catch(err => { logger.error(err); process.exit(1); });

module.exports = app;
