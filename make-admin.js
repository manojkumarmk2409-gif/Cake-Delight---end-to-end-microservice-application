require('dotenv').config();
const mysql = require('mysql2/promise');

async function makeAdmin() {
    const email = process.argv[2];
    const role = process.argv[3] || 'super_admin';

    if (!email) {
        console.log('Usage: node make-admin.js <email> [role]');
        console.log('Allowed roles: user, admin, super_admin');
        process.exit(1);
    }

    if (!['user', 'admin', 'super_admin'].includes(role)) {
        console.log('Invalid role. Allowed roles: user, admin, super_admin');
        process.exit(1);
    }

    const host = process.env.MYSQL_HOST || 'localhost';
    const port = Number(process.env.MYSQL_PORT) || 3307;
    const user = process.env.MYSQL_USER || 'cake_user';
    const password = process.env.MYSQL_PASSWORD || 'cake_pass';
    const database = process.env.MYSQL_DATABASE || 'user_db';

    let connection;
    try {
        connection = await mysql.createConnection({ host, port, user, password, database });
        const [result] = await connection.query('UPDATE users SET role = ? WHERE email = ?', [role, email]);

        if (result.affectedRows > 0) {
            console.log(`User ${email} is now a ${role}!`);
        } else {
            console.log(`User ${email} not found.`);
        }
    } catch (err) {
        console.error('Error updating user role:', err.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

makeAdmin();
