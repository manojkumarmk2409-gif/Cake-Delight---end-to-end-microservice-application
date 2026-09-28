const { getPool, toUser } = require('../db');
const PHONE_RE = /^[0-9+\-() ]{7,20}$/;
const NAME_RE = /^[\p{L}\p{M} .'\-]+$/u;
const trimText = (value) => (typeof value === 'string' ? value.trim() : '');
const validateName = (value) => {
    const name = trimText(value);
    if (!name) return '';
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 80) return 'Name must be 80 characters or less';
    if (!NAME_RE.test(name)) return 'Name can only contain letters and common punctuation';
    return '';
};
const validatePhone = (value) => {
    const phone = trimText(value);
    if (!phone) return '';
    if (!PHONE_RE.test(phone)) return 'Enter a valid phone number';
    return '';
};
const validateAddress = (value) => {
    const address = trimText(value);
    if (!address) return '';
    if (address.length < 10) return 'Address must be at least 10 characters';
    if (address.length > 240) return 'Address must be 240 characters or less';
    return '';
};

exports.getMe = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
        const user = toUser(rows[0]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        next(err);
    }
};

exports.updateMe = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const name = trimText(req.body?.name);
        const phone = trimText(req.body?.phone);
        const address = trimText(req.body?.address);
        const errors = [validateName(name), validatePhone(phone), validateAddress(address)].filter(Boolean);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0] });
        }
        const pool = getPool();
        await pool.query(
            `UPDATE users
             SET name = COALESCE(?, name),
                 phone = COALESCE(?, phone),
                 address = COALESCE(?, address)
             WHERE id = ?`,
            [name || null, phone || null, address || null, userId]
        );

        const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
        const user = toUser(rows[0]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        next(err);
    }
};
