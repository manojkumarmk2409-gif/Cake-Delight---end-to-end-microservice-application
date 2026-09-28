const request = require('supertest');

// Mock rabbitmq consumer
jest.mock('../src/rabbitmq/consumer', () => ({
    startConsumer: jest.fn().mockResolvedValue(undefined)
}));

// Mock db
jest.mock('../src/db', () => {
    let mockNotifications = [
        {
            id: 1,
            order_id: 'order-123',
            user_id: 'user-456',
            channel: 'email',
            status: 'sent',
            message: 'Your order #order-123 has been confirmed!',
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];

    const mockPool = {
        query: jest.fn(async (sql, params = []) => {
            const sqlUpper = sql.toUpperCase();
            if (sqlUpper.includes('SELECT * FROM NOTIFICATIONS WHERE USER_ID = ?')) {
                const found = mockNotifications.filter(n => n.user_id === params[0]);
                return [found];
            }
            if (sqlUpper.includes('SELECT * FROM NOTIFICATIONS')) {
                return [mockNotifications];
            }
            return [[]];
        })
    };

    return {
        getPool: () => mockPool,
        initSchema: jest.fn().mockResolvedValue(undefined),
        toNotification: (row) => {
            if (!row) return null;
            return {
                _id: String(row.id),
                id: String(row.id),
                orderId: row.order_id,
                userId: row.user_id,
                channel: row.channel,
                status: row.status,
                message: row.message,
                sentAt: row.sent_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        }
    };
});

const app = require('../src/server');

describe('Notification Service - API Tests', () => {
    describe('GET /health', () => {
        it('should return health ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.service).toBe('notification-service');
        });
    });

    describe('GET /', () => {
        it('should return 401 when unauthenticated', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(401);
        });

        it('should return user notifications when authenticated', async () => {
            const res = await request(app)
                .get('/')
                .set('x-user-id', 'user-456')
                .set('x-user-role', 'user');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(1);
        });
    });
});
