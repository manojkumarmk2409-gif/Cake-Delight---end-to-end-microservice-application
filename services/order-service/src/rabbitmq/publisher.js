const amqplib = require('amqplib');
const logger = require('../logger');

let channel = null;
const QUEUES = ['order.completed', 'order.packed', 'order.cancelled', 'order.status_changed'];

const connect = async () => {
    if (process.env.NODE_ENV === 'test') return; // Skip in tests
    try {
        const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        channel = await conn.createChannel();
        for (const q of QUEUES) {
            await channel.assertQueue(q, { durable: true });
        }
        logger.info('RabbitMQ connected');
        conn.on('close', () => {
            logger.warn('RabbitMQ connection closed, reconnecting...');
            setTimeout(connect, 5000);
        });
    } catch (err) {
        logger.error(`RabbitMQ connection error: ${err.message}`);
        setTimeout(connect, 5000);
    }
};

const publish = (queue, data) => {
    if (!channel) {
        logger.warn('No RabbitMQ channel, skipping publish');
        return false;
    }
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
    logger.info(`Published to ${queue}: ${JSON.stringify(data)}`);
    return true;
};

module.exports = { connect, publish };
