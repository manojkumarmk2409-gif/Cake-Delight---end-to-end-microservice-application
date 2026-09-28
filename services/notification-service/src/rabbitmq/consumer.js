const amqplib = require('amqplib');
const { sendNotification } = require('../services/notificationService');
const logger = require('../logger');

const QUEUES = ['order.completed', 'order.packed', 'order.cancelled', 'order.status_changed'];

const startConsumer = async () => {
    if (process.env.NODE_ENV === 'test') return;
    try {
        const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        const channel = await conn.createChannel();
        for (const queue of QUEUES) {
            await channel.assertQueue(queue, { durable: true });
            logger.info(`Waiting for messages on queue: ${queue}`);

            channel.consume(queue, async (msg) => {
                if (!msg) return;
                try {
                    const data = JSON.parse(msg.content.toString());
                    logger.info(`Received ${queue} event: ${JSON.stringify(data)}`);
                    if (queue === 'order.completed') {
                        await sendNotification(data);
                    } else if (queue === 'order.packed') {
                        await sendNotification({ ...data, status: 'packing' });
                    } else if (queue === 'order.cancelled') {
                        await sendNotification({ ...data, status: 'cancelled' });
                    } else if (queue === 'order.status_changed') {
                        await sendNotification(data);
                    }
                    channel.ack(msg);
                } catch (err) {
                    logger.error(`Error processing message: ${err.message}`);
                    channel.nack(msg, false, false);
                }
            });
        }

        conn.on('close', () => {
            logger.warn('RabbitMQ connection closed, reconnecting...');
            setTimeout(startConsumer, 5000);
        });
    } catch (err) {
        logger.error(`RabbitMQ connection error: ${err.message}`);
        setTimeout(startConsumer, 5000);
    }
};

module.exports = { startConsumer };
