const { getPool, toRating } = require('../db');
const { calculateAverage } = require('../utils/calculateAverage');
const logger = require('../logger');
const trimText = (value) => (typeof value === 'string' ? value.trim() : '');

const submitRating = async (req, res, next) => {
    try {
        const cakeId = trimText(req.body?.cakeId);
        const userId = trimText(req.headers['x-user-id']) || trimText(req.body?.userId);
        const score = Number(req.body?.score);
        const comment = trimText(req.body?.comment);

        if (!cakeId || !userId || req.body?.score === undefined) {
            return res.status(400).json({ error: 'cakeId, userId, and score are required' });
        }
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            return res.status(400).json({ error: 'score must be between 1 and 5' });
        }
        if (comment.length > 500) {
            return res.status(400).json({ error: 'comment must be 500 characters or less' });
        }

        const [result] = await getPool().query(
            `INSERT INTO ratings (cake_id, user_id, score, comment)
             VALUES (?, ?, ?, ?)`,
            [cakeId, userId, score, comment || '']
        );
        const [rows] = await getPool().query('SELECT * FROM ratings WHERE id = ? LIMIT 1', [result.insertId]);
        const rating = toRating(rows[0]);
        logger.info(`Rating submitted: ${rating._id}`);
        res.status(201).json({ success: true, data: rating });
    } catch (err) {
        if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
            return res.status(409).json({ error: 'You have already rated this cake' });
        }
        next(err);
    }
};

const getRatings = async (req, res, next) => {
    try {
        const [rows] = await getPool().query('SELECT * FROM ratings WHERE cake_id = ? ORDER BY created_at DESC', [req.params.cakeId]);
        const ratings = rows.map(row => toRating(row));
        res.json({ success: true, data: ratings });
    } catch (err) { next(err); }
};

const getAverage = async (req, res, next) => {
    try {
        const [rows] = await getPool().query('SELECT score FROM ratings WHERE cake_id = ?', [req.params.cakeId]);
        const { average, count } = calculateAverage(rows.map(row => ({ score: Number(row.score) })));
        res.json({ success: true, data: { cakeId: req.params.cakeId, average, count } });
    } catch (err) { next(err); }
};

module.exports = { submitRating, getRatings, getAverage };
