const request = require('supertest');

// Mock db before requiring server
jest.mock('../src/db', () => {
    let mockCakes = [
        {
            id: 1,
            name: 'Chocolate Delight',
            description: 'Rich chocolate cake',
            category: 'Chocolate',
            price: 20.00,
            availability: 1,
            image_url: 'https://example.com/cake.jpg',
            variants_json: '[]',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Strawberry Dream',
            description: 'Fresh strawberry cake',
            category: 'Fruit',
            price: 30.00,
            availability: 1,
            image_url: 'https://example.com/strawberry.jpg',
            variants_json: '[]',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];

    const mockPool = {
        query: jest.fn(async (sql, params = []) => {
            const sqlUpper = sql.toUpperCase();
            if (sqlUpper.includes('SELECT * FROM CAKES WHERE ID = ?')) {
                const found = mockCakes.filter(c => String(c.id) === String(params[0]));
                return [found];
            }
            if (sqlUpper.includes('MIN(PRICE)') && sqlUpper.includes('MAX(PRICE)')) {
                return [[{ minPrice: 20, maxPrice: 30 }]];
            }
            if (sqlUpper.includes('SELECT * FROM CAKES')) {
                let filtered = [...mockCakes];
                if (params.length > 0) {
                    // Simple filter matching
                    for (const p of params) {
                        if (typeof p === 'string' && p.startsWith('%') && p.endsWith('%')) {
                            const term = p.replace(/%/g, '').toLowerCase();
                            filtered = filtered.filter(c => c.name.toLowerCase().includes(term));
                        }
                    }
                }
                return [filtered];
            }
            if (sqlUpper.includes('INSERT INTO CAKES')) {
                const newCake = {
                    id: mockCakes.length + 1,
                    name: params[0],
                    description: params[1],
                    category: params[2],
                    price: Number(params[3]),
                    availability: params[4] ? 1 : 0,
                    image_url: params[5] || '',
                    variants_json: params[6] || '[]',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                mockCakes.push(newCake);
                return [{ insertId: newCake.id }];
            }
            if (sqlUpper.includes('UPDATE CAKES')) {
                return [{ affectedRows: 1 }];
            }
            if (sqlUpper.includes('DELETE FROM CAKES')) {
                const id = params[0];
                const prevLen = mockCakes.length;
                mockCakes = mockCakes.filter(c => String(c.id) !== String(id));
                return [{ affectedRows: prevLen - mockCakes.length }];
            }
            return [[]];
        })
    };

    return {
        getPool: () => mockPool,
        initSchema: jest.fn().mockResolvedValue(undefined),
        toCake: (row) => {
            if (!row) return null;
            return {
                _id: String(row.id),
                id: String(row.id),
                name: row.name,
                description: row.description,
                category: row.category,
                price: Number(row.price),
                availability: Boolean(row.availability),
                imageUrl: row.image_url,
                variants: [],
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        }
    };
});

const app = require('../src/server');

describe('Catalog Service', () => {
    describe('GET /health', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.service).toBe('catalog-service');
        });
    });

    describe('GET /cakes', () => {
        it('should return all cakes', async () => {
            const res = await request(app).get('/cakes');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should get price range', async () => {
            const res = await request(app).get('/cakes/price-range');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.minPrice).toBeDefined();
            expect(res.body.data.maxPrice).toBeDefined();
        });
    });

    describe('GET /cakes/:id', () => {
        it('should get a single cake by id', async () => {
            const res = await request(app).get('/cakes/1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe('1');
        });

        it('should return 404 for non-existent cake', async () => {
            const res = await request(app).get('/cakes/999');
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Admin role verification for POST /cakes', () => {
        it('should reject without super_admin role', async () => {
            const res = await request(app)
                .post('/cakes')
                .set('x-user-role', 'user')
                .send({
                    name: 'New Cake',
                    description: 'Delicious',
                    category: 'Test',
                    price: 15.00
                });
            expect(res.status).toBe(403);
        });
    });
});
