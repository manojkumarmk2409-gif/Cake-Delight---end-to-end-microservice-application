const request = require('supertest');

// Mock db
jest.mock('../src/db', () => {
    let mockCart = {
        id: 1,
        user_id: 'user-123',
        items: JSON.stringify([
            { cakeId: '1', name: 'Chocolate Delight', price: 20, quantity: 2, variantKey: 'regular' }
        ]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const mockPool = {
        query: jest.fn(async (sql, params = []) => {
            const sqlUpper = sql.toUpperCase();
            if (sqlUpper.includes('SELECT * FROM CARTS WHERE USER_ID = ?')) {
                if (params[0] === 'user-123') {
                    return [[mockCart]];
                }
                return [[]];
            }
            if (sqlUpper.includes('INSERT INTO CARTS') || sqlUpper.includes('UPDATE CARTS')) {
                return [{ affectedRows: 1, insertId: 1 }];
            }
            return [[]];
        })
    };

    return {
        getPool: () => mockPool,
        initSchema: jest.fn().mockResolvedValue(undefined),
        toCart: (row) => {
            if (!row) return null;
            const items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);
            return {
                _id: String(row.id),
                id: String(row.id),
                userId: row.user_id,
                items,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                total: items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
            };
        }
    };
});

const app = require('../src/server');

describe('Cart Service - API Tests', () => {
    describe('GET /health', () => {
        it('should return health ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.service).toBe('cart-service');
        });
    });

    describe('GET /', () => {
        it('should return 401 when unauthenticated', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(401);
        });

        it('should return user cart when authenticated', async () => {
            const res = await request(app)
                .get('/')
                .set('x-user-id', 'user-123');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items.length).toBe(1);
            expect(res.body.data.total).toBe(40);
        });
    });
});
