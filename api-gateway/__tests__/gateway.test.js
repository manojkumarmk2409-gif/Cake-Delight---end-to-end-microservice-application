const request = require('supertest');
const app = require('../server');

describe('API Gateway', () => {
    describe('GET /health', () => {
        it('should return 200 and health status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.service).toBe('api-gateway');
            expect(res.body.timestamp).toBeDefined();
        });
    });

    describe('404 handling', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/api/unknown-route');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Route not found');
        });
    });
});
