const http = require('http');

const data = JSON.stringify({
    name: 'Test User',
    email: 'test@test.com',
    password: 'Password123',
    phone: '1234567890',
    address: '123 Main Street, Suite 100'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error('Request error:', error.message);
});

req.write(data);
req.end();
