const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
    createTransporter,
    getMailFrom,
    hasSmtpConfig,
    buildOtpEmailTemplate,
    buildPasswordResetEmailTemplate
} = require('../mailer');
const { getPool, toUser } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 10;
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-() ]{7,20}$/;
const NAME_RE = /^[\p{L}\p{M} .'\-]+$/u;

const trimText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => trimText(value).toLowerCase();
const validateEmail = (value) => {
    const email = normalizeEmail(value);
    if (!email) return 'Email is required';
    if (!EMAIL_RE.test(email)) return 'Enter a valid email address';
    return '';
};
const validatePassword = (value) => {
    const password = typeof value === 'string' ? value : '';
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'Password must contain at least one letter and one number';
    }
    return '';
};
const validateName = (value) => {
    const name = trimText(value);
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 80) return 'Name must be 80 characters or less';
    if (!NAME_RE.test(name)) return 'Name can only contain letters and common punctuation';
    return '';
};
const validatePhone = (value) => {
    const phone = trimText(value);
    if (!phone) return 'Phone number is required';
    if (!PHONE_RE.test(phone)) return 'Enter a valid phone number';
    return '';
};
const validateAddress = (value) => {
    const address = trimText(value);
    if (!address) return 'Address is required';
    if (address.length < 10) return 'Address must be at least 10 characters';
    if (address.length > 240) return 'Address must be 240 characters or less';
    return '';
};
const validateOtp = (value) => (/^\d{6}$/.test(trimText(value)) ? '' : 'Enter the 6-digit OTP');
const validateResetToken = (value) => (/^[a-f0-9]{64}$/i.test(trimText(value)) ? '' : 'Invalid reset token');

const buildToken = (user) => jwt.sign(
    { userId: user.id || user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const buildUserResponse = (user) => ({
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role
});

const generateOtp = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

const sendOtpEmail = async ({ email, name, otp }) => {
    const transporter = createTransporter();
    if (!transporter) {
        const error = new Error('SMTP email service is not configured');
        error.status = 503;
        throw error;
    }

    const otpEmail = buildOtpEmailTemplate({
        name,
        otp,
        ttlMinutes: OTP_TTL_MINUTES
    });

    await transporter.sendMail({
        from: getMailFrom(),
        to: email,
        subject: otpEmail.subject,
        text: otpEmail.text,
        html: otpEmail.html,
        replyTo: getMailFrom(),
        priority: 'high',
        headers: {
            'X-Entity-Ref-ID': `cake-delight-otp-${Date.now()}`
        }
    });
};

const buildResetUrl = (req, token) => {
    const baseUrl =
        process.env.FRONTEND_URL ||
        process.env.APP_URL ||
        req.get('origin') ||
        `${req.protocol}://${req.get('host')}`;
    const normalizedBaseUrl = String(baseUrl).replace(/\/$/, '');
    return `${normalizedBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

const sendPasswordResetEmail = async ({ req, email, name, token }) => {
    const transporter = createTransporter();
    if (!transporter) {
        const error = new Error('SMTP email service is not configured');
        error.status = 503;
        throw error;
    }

    const resetUrl = buildResetUrl(req, token);
    const resetEmail = buildPasswordResetEmailTemplate({
        name,
        resetUrl,
        ttlMinutes: PASSWORD_RESET_TTL_MINUTES
    });

    await transporter.sendMail({
        from: getMailFrom(),
        to: email,
        subject: resetEmail.subject,
        text: resetEmail.text,
        html: resetEmail.html,
        replyTo: getMailFrom(),
        priority: 'high',
        headers: {
            'X-Entity-Ref-ID': `cake-delight-password-reset-${Date.now()}`
        }
    });
};

exports.register = async (req, res, next) => {
    try {
        const name = trimText(req.body?.name);
        const email = normalizeEmail(req.body?.email);
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const phone = trimText(req.body?.phone);
        const address = trimText(req.body?.address);

        const validationErrors = [
            validateName(name),
            validateEmail(email),
            validatePassword(password),
            validatePhone(phone),
            validateAddress(address)
        ].filter(Boolean);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0] });
        }

        const pool = getPool();
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
        const now = new Date();

        await pool.query(
            `INSERT INTO pending_registrations
                (name, email, password_hash, phone, address, otp_hash, expires_at, attempts, last_otp_sent_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                password_hash = VALUES(password_hash),
                phone = VALUES(phone),
                address = VALUES(address),
                otp_hash = VALUES(otp_hash),
                expires_at = VALUES(expires_at),
                attempts = 0,
                last_otp_sent_at = VALUES(last_otp_sent_at)`,
            [name, email, passwordHash, phone || null, address || null, otpHash, expiresAt, now]
        );

        try {
            await sendOtpEmail({ email, name, otp });
        } catch (mailErr) {
            await pool.query('DELETE FROM pending_registrations WHERE email = ?', [email]);
            throw mailErr;
        }

        res.status(202).json({
            message: 'OTP sent to your email address. Please verify it to complete registration.',
            email,
            otpSent: true,
            otpRequired: true,
            emailVerificationAvailable: hasSmtpConfig()
        });
    } catch (err) {
        next(err);
    }
};

exports.verifyRegistration = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const otp = trimText(req.body?.otp);
        const emailError = validateEmail(email);
        const otpError = validateOtp(otp);
        if (emailError || otpError) {
            return res.status(400).json({ error: emailError || otpError });
        }

        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM pending_registrations WHERE email = ?', [email]);
        const pendingRow = rows[0];
        if (!pendingRow) {
            return res.status(404).json({ error: 'No pending registration found for this email' });
        }

        const pending = {
            ...pendingRow,
            expiresAt: pendingRow.expires_at,
            otpHash: pendingRow.otp_hash
        };

        if (new Date(pending.expiresAt).getTime() < Date.now()) {
            await pool.query('DELETE FROM pending_registrations WHERE id = ?', [pendingRow.id]);
            return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
        }

        await pool.query('UPDATE pending_registrations SET attempts = attempts + 1 WHERE id = ?', [pendingRow.id]);

        const otpMatches = await bcrypt.compare(String(otp).trim(), pending.otpHash);
        if (!otpMatches) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            await pool.query('DELETE FROM pending_registrations WHERE id = ?', [pendingRow.id]);
            return res.status(400).json({ error: 'Email already in use' });
        }

        const [insertResult] = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, address, role)
             VALUES (?, ?, ?, ?, ?, 'user')`,
            [pending.name, pending.email, pending.password_hash, pending.phone, pending.address]
        );
        await pool.query('DELETE FROM pending_registrations WHERE id = ?', [pendingRow.id]);

        const user = toUser({
            id: insertResult.insertId,
            name: pending.name,
            email: pending.email,
            password_hash: pending.password_hash,
            phone: pending.phone,
            address: pending.address,
            role: 'user'
        });

        const token = buildToken(user);
        res.status(201).json({ token, user: buildUserResponse(user) });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const emailError = validateEmail(email);
        const passwordError = password ? '' : 'Password is required';
        if (emailError || passwordError) {
            return res.status(400).json({ error: emailError || passwordError });
        }

        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        const userRow = rows[0];
        if (!userRow) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, userRow.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = toUser(userRow);
        const token = buildToken(user);
        res.json({ token, user: buildUserResponse(user) });
    } catch (err) {
        next(err);
    }
};

exports.requestPasswordReset = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const emailError = validateEmail(email);
        if (emailError) {
            return res.status(400).json({ error: emailError });
        }

        const pool = getPool();
        const [rows] = await pool.query('SELECT id, name, email FROM users WHERE email = ? LIMIT 1', [email]);
        const userRow = rows[0];
        if (!userRow) {
            return res.status(200).json({
                message: 'If an account exists for that email, a reset link has been sent.'
            });
        }

        const token = generateResetToken();
        const tokenHash = await bcrypt.hash(token, 10);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userRow.id]);
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [userRow.id, tokenHash, expiresAt]
        );

        try {
            await sendPasswordResetEmail({
                req,
                email: userRow.email,
                name: userRow.name,
                token
            });
        } catch (mailErr) {
            await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userRow.id]);
            throw mailErr;
        }

        res.status(202).json({
            message: 'If an account exists for that email, a reset link has been sent.',
            email,
            resetSent: true
        });
    } catch (err) {
        next(err);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const token = trimText(req.body?.token);
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

        const tokenError = validateResetToken(token);
        const passwordError = validatePassword(password);
        if (tokenError || passwordError) {
            return res.status(400).json({ error: tokenError || passwordError });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT prt.id, prt.user_id, prt.token_hash, prt.expires_at, u.email, u.name
             FROM password_reset_tokens prt
             INNER JOIN users u ON u.id = prt.user_id
             WHERE prt.used_at IS NULL
             ORDER BY prt.created_at DESC`
        );

        let matchedTokenRow = null;
        let matchedUser = null;
        for (const row of rows) {
            if (new Date(row.expires_at).getTime() < Date.now()) {
                continue;
            }
            const tokenMatches = await bcrypt.compare(token, row.token_hash);
            if (tokenMatches) {
                matchedTokenRow = row;
                matchedUser = { id: row.user_id, email: row.email, name: row.name };
                break;
            }
        }

        if (!matchedTokenRow || !matchedUser) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, matchedUser.id]);
        await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [matchedTokenRow.id]);
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ? AND id <> ?', [
            matchedUser.id,
            matchedTokenRow.id
        ]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
};

exports.logout = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
};
