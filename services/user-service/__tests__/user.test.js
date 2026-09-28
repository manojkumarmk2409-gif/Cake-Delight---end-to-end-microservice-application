const request = require('supertest');

// Mock db
jest.mock('../src/db', () => {
    let mockUsers = [
        {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            password_hash: '$2a$10$abcdefghijklmnopqrstuu',
            phone: '1234567890',
            address: '123 Test Street, City',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];

    const mockPool = {
        query: jest.fn(async (sql, params = []) => {
            const sqlUpper = sql.toUpperCase();
            if (sqlUpper.includes('SELECT * FROM USERS WHERE ID = ?') || sqlUpper.includes('SELECT ID, NAME, EMAIL, PHONE, ADDRESS, ROLE FROM USERS WHERE ID = ?')) {
                const found = mockUsers.filter(u => String(u.id) === String(params[0]));
                return [found];
            }
            if (sqlUpper.includes('SELECT * FROM USERS WHERE EMAIL = ?')) {
                const found = mockUsers.filter(u => u.email === params[0]);
                return [found];
            }
            return [[]];
        })
    };

    return {
        getPool: () => mockPool,
        initSchema: jest.fn().mockResolvedValue(undefined),
        toUser: (row) => {
            if (!row) return null;
            return {
                _id: String(row.id),
                id: String(row.id),
                name: row.name,
                email: row.email,
                phone: row.phone,
                address: row.address,
                role: row.role,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        },
        toPendingRegistration: jest.fn()
    };
});

const app = require('../src/server');

describe('User Service - API Tests', () => {
    describe('GET /health', () => {
        it('should return health ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.service).toBe('user-service');
        });
    });

    describe('GET /users/me', () => {
        it('should return 401 when unauthenticated', async () => {
            const res = await request(app).get('/users/me');
            expect(res.status).toBe(401);
        });

        it('should return user profile when authenticated', async () => {
            const res = await request(app)
                .get('/users/me')
                .set('x-user-id', '1')
                .set('x-user-role', 'user');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe('test@example.com');
        });
    });
});
