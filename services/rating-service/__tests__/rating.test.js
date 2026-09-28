const request = require('supertest');
const { calculateAverage } = require('../src/utils/calculateAverage');

// Mock db before requiring server
jest.mock('../src/db', () => {
    let mockRatings = [
        { id: 1, cake_id: '1', user_id: 'user-1', score: 5, comment: 'Awesome', created_at: new Date(), updated_at: new Date() },
        { id: 2, cake_id: '1', user_id: 'user-2', score: 4, comment: 'Good', created_at: new Date(), updated_at: new Date() }
    ];

    const mockPool = {
        query: jest.fn(async (sql, params = []) => {
            const sqlUpper = sql.toUpperCase();
            if (sqlUpper.includes('SELECT * FROM RATINGS WHERE CAKE_ID = ? AND USER_ID = ?')) {
                const found = mockRatings.filter(r => r.cake_id === params[0] && r.user_id === params[1]);
                return [found];
            }
            if (sqlUpper.includes('SELECT * FROM RATINGS WHERE CAKE_ID = ?')) {
                const found = mockRatings.filter(r => r.cake_id === params[0]);
                return [found];
            }
            if (sqlUpper.includes('INSERT INTO RATINGS')) {
                const newRating = {
                    id: mockRatings.length + 1,
                    cake_id: params[0],
                    user_id: params[1],
                    score: params[2],
                    comment: params[3] || '',
                    created_at: new Date(),
                    updated_at: new Date()
                };
                mockRatings.push(newRating);
                return [{ insertId: newRating.id }];
            }
            return [[]];
        })
    };

    return {
        getPool: () => mockPool,
        initSchema: jest.fn().mockResolvedValue(undefined),
        toRating: (row) => {
            if (!row) return null;
            return {
                _id: String(row.id),
                id: String(row.id),
                cakeId: row.cake_id,
                userId: row.user_id,
                score: Number(row.score),
                comment: row.comment,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        }
    };
});

const app = require('../src/server');

describe('Rating Service - Unit Tests', () => {
    describe('calculateAverage', () => {
        it('should return 0 for empty array', () => {
            expect(calculateAverage([]).average).toBe(0);
            expect(calculateAverage([]).count).toBe(0);
        });
        it('should calculate average correctly', () => {
            const result = calculateAverage([{ score: 4 }, { score: 5 }, { score: 3 }]);
            expect(result.average).toBe(4);
            expect(result.count).toBe(3);
        });
        it('should round to 1 decimal place', () => {
            const result = calculateAverage([{ score: 4 }, { score: 5 }]);
            expect(result.average).toBe(4.5);
        });
    });
});

describe('Rating Service - API Tests', () => {
    describe('GET /health', () => {
        it('should return health ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /', () => {
        it('should create a rating with valid inputs', async () => {
            const res = await request(app)
                .post('/')
                .set('x-user-id', 'user-new')
                .send({ cakeId: '2', score: 5, comment: 'Amazing!' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('should return 400 for score out of range', async () => {
            const res = await request(app)
                .post('/')
                .set('x-user-id', 'user-3')
                .send({ cakeId: '2', score: 6 });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /:cakeId', () => {
        it('should return ratings for a cake', async () => {
            const res = await request(app).get('/1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /:cakeId/average', () => {
        it('should return average rating', async () => {
            const res = await request(app).get('/1/average');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.average).toBeDefined();
        });
    });
});
