const request = require('supertest');
const { calculateTotal } = require('../src/utils/calculateTotal');

// Mock publisher
jest.mock('../src/rabbitmq/publisher', () => ({
    connect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true)
}));

// Mock db
jest.mock('../src/db', () => {
    let mockOrders = [
        {
            id: 1,
            user_id: 'user-123',
            items: JSON.stringify([{ cakeId: 'cake-abc', name: 'Chocolate Cake', price: 25.00, quantity: 2 }]),
            total_amount: 50.00,
            discount: 0,
            status: 'confirmed',
            address: '123 Main Street, Suite 100',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_updated_at: new Date().toISOString()
        }
    ];

    const mockPool = {
        query: jest.fn(async (sql, params = []) => {
            const sqlUpper = sql.toUpperCase();
            if (sqlUpper.includes('SELECT * FROM ORDERS WHERE ID = ?')) {
                const found = mockOrders.filter(o => String(o.id) === String(params[0]));
                return [found];
            }
            if (sqlUpper.includes('SELECT * FROM ORDERS WHERE USER_ID = ?')) {
                const found = mockOrders.filter(o => o.user_id === params[0]);
                return [found];
            }
            if (sqlUpper.includes('SELECT * FROM ORDERS')) {
                return [mockOrders];
            }
            if (sqlUpper.includes('UPDATE ORDERS SET STATUS')) {
                return [{ affectedRows: 1 }];
            }
            return [[]];
        })
    };

    return {
        getPool: () => mockPool,
        initSchema: jest.fn().mockResolvedValue(undefined),
        toOrder: (row) => {
            if (!row) return null;
            const items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);
            return {
                _id: String(row.id),
                id: String(row.id),
                userId: row.user_id,
                items,
                totalAmount: Number(row.total_amount),
                discount: Number(row.discount),
                status: row.status,
                address: row.address,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                statusUpdatedAt: row.status_updated_at
            };
        },
        normalizeOrderStatus: (status) => status || 'confirmed',
        ORDER_STATUS_FLOW: ['confirmed', 'packed', 'ready_to_delivery', 'shipped', 'delivered']
    };
});

const app = require('../src/server');

describe('Order Service - Unit Tests', () => {
    describe('calculateTotal', () => {
        it('should return 0 for empty array', () => {
            expect(calculateTotal([])).toBe(0);
        });
        it('should calculate correct total', () => {
            expect(calculateTotal([{ price: 10, quantity: 2 }, { price: 5, quantity: 3 }])).toBe(35);
        });
        it('should handle rounding correctly', () => {
            expect(calculateTotal([{ price: 10.005, quantity: 1 }])).toBe(10.01);
        });
    });
});

describe('Order Service - API Tests', () => {
    describe('GET /health', () => {
        it('should return health ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('GET /', () => {
        it('should return 401 when unauthenticated', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(401);
        });

        it('should return user orders when authenticated', async () => {
            const res = await request(app)
                .get('/')
                .set('x-user-id', 'user-123')
                .set('x-user-role', 'user');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /:id', () => {
        it('should return order details for owner', async () => {
            const res = await request(app)
                .get('/1')
                .set('x-user-id', 'user-123')
                .set('x-user-role', 'user');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe('1');
        });
    });
});
