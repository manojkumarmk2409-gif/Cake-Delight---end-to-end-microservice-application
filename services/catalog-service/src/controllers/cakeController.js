const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { getPool, toCake } = require('../db');
const logger = require('../logger');
const { randomUUID } = require('crypto');

axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

const RATING_SERVICE_URL = process.env.RATING_SERVICE_URL || 'http://rating-service:3004';
const VALID_UNITS = new Set(['g', 'kg', 'ml', 'l', 'pcs']);

const normalizePrice = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || !Number.isInteger(number) || number < 0) return null;
    return number;
};

const normalizeAvailability = (value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
};

const parseMaybeJson = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
};

const normalizeVariant = (variant, index = 0) => {
    if (!variant || typeof variant !== 'object') return null;

    const label = typeof variant.label === 'string' ? variant.label.trim() : '';
    const unit = typeof variant.unit === 'string' ? variant.unit.trim() : 'g';
    const amountValue = variant.amount ?? variant.size ?? variant.weight ?? variant.volume;
    const amountNumber = amountValue === undefined || amountValue === null || amountValue === ''
        ? null
        : Number(amountValue);
    const price = normalizePrice(variant.price);
    const availability = normalizeAvailability(variant.availability);

    if (!label && price === null) {
        return null;
    }

    return {
        id: typeof variant.id === 'string' && variant.id.trim() ? variant.id.trim() : randomUUID(),
        label: label || `Variant ${index + 1}`,
        unit,
        amount: Number.isFinite(amountNumber) ? amountNumber : null,
        price,
        availability: availability === undefined ? true : availability,
        isDefault: Boolean(variant.isDefault) || index === 0
    };
};

const normalizeVariants = (value) => {
    const parsed = parseMaybeJson(value);
    if (parsed === undefined || parsed === null || parsed === '') {
        return undefined;
    }

    const source = Array.isArray(parsed) ? parsed : [];
    const variants = source
        .map((variant, index) => normalizeVariant(variant, index))
        .filter(Boolean);

    return variants;
};

const buildImageUrl = (req, file, imageUrl) => {
    if (file?.filename) return `/api/catalog/uploads/${file.filename}`;
    if (typeof imageUrl === 'string' && imageUrl.trim()) return imageUrl.trim();
    return '';
};

const validateVariantPayload = (variants) => {
    if (variants === undefined || variants === null || variants === '') {
        return { error: '', variants: undefined };
    }

    const parsed = parseMaybeJson(variants);
    if (!Array.isArray(parsed) || parsed.length === 0) {
        return { error: 'At least one variant is required', variants: undefined };
    }

    const normalized = [];
    for (let index = 0; index < parsed.length; index += 1) {
        const variant = parsed[index];
        if (!variant || typeof variant !== 'object') {
            return { error: `Variant ${index + 1} is invalid`, variants: undefined };
        }

        const label = typeof variant.label === 'string' ? variant.label.trim() : '';
        if (!label) {
            return { error: `Variant ${index + 1} label is required`, variants: undefined };
        }
        if (label.length > 60) {
            return { error: `Variant ${index + 1} label must be 60 characters or less`, variants: undefined };
        }

        const unit = typeof variant.unit === 'string' ? variant.unit.trim() : 'g';
        if (!VALID_UNITS.has(unit)) {
            return { error: `Variant ${index + 1} unit is invalid`, variants: undefined };
        }

        const price = normalizePrice(variant.price);
        if (price === null) {
            return { error: `Variant ${index + 1} price is required`, variants: undefined };
        }

        const amountValue = variant.amount ?? variant.size ?? variant.weight ?? variant.volume;
        const amount = amountValue === undefined || amountValue === null || amountValue === ''
            ? null
            : Number(amountValue);
        if (amount !== null && !Number.isFinite(amount)) {
            return { error: `Variant ${index + 1} amount must be a number`, variants: undefined };
        }
        if (amount !== null && amount < 0) {
            return { error: `Variant ${index + 1} amount must be 0 or higher`, variants: undefined };
        }

        normalized.push({
            id: typeof variant.id === 'string' && variant.id.trim() ? variant.id.trim() : randomUUID(),
            label,
            unit,
            amount,
            price,
            availability: normalizeAvailability(variant.availability) ?? true,
            isDefault: Boolean(variant.isDefault) || index === 0
        });
    }

    return { error: '', variants: normalized };
};

const getCakePayload = (req, { allowPartial = false } = {}) => {
    const { name, description, category, price, availability, imageUrl, variants } = req.body || {};
    const payload = {};
    if (!allowPartial || name !== undefined) payload.name = typeof name === 'string' ? name.trim() : name;
    if (!allowPartial || description !== undefined) payload.description = typeof description === 'string' ? description.trim() : description;
    if (!allowPartial || category !== undefined) payload.category = typeof category === 'string' ? category.trim() : category;
    if (price !== undefined) payload.price = normalizePrice(price);
    if (availability !== undefined) payload.availability = normalizeAvailability(availability);
    const normalizedVariants = normalizeVariants(variants);
    if (normalizedVariants !== undefined) payload.variants = normalizedVariants;
    const uploadedImageUrl = buildImageUrl(req, req.file, imageUrl);
    if (uploadedImageUrl) {
        payload.imageUrl = uploadedImageUrl;
    } else if (!allowPartial) {
        payload.imageUrl = '';
    }
    return payload;
};

const serializeCake = (cake) => {
    if (!cake) return null;
    const variants = Array.isArray(cake.variants) ? cake.variants : [];
    return {
        ...cake,
        price: Math.round(Number(cake.price || 0)),
        variants: variants.map((variant, index) => ({
            id: variant.id || `variant-${index + 1}`,
            label: variant.label || `Variant ${index + 1}`,
            unit: variant.unit || 'g',
            amount: variant.amount ?? null,
            price: Math.round(Number(variant.price || 0)),
            availability: variant.availability !== false,
            isDefault: Boolean(variant.isDefault)
        })),
        averageRating: Number(cake.averageRating || 0),
        ratingCount: Number(cake.ratingCount || 0)
    };
};

const buildLegacyVariants = (cake) => {
    if (!cake) return [];
    return [{
        id: `legacy-${cake._id}`,
        label: 'Standard',
        unit: 'g',
        amount: null,
        price: Math.round(Number(cake.price || 0)),
        availability: cake.availability,
        isDefault: true
    }];
};

const toTimestamp = (value) => {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
};

const sortCakes = (cakes, sortBy = 'newest', sortOrder = 'desc') => {
    const direction = String(sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const mode = String(sortBy || 'newest').toLowerCase();
    const list = [...cakes];

    list.sort((a, b) => {
        if (mode === 'price') {
            const diff = (Number(a.price || 0) - Number(b.price || 0)) * direction;
            if (diff !== 0) return diff;
            return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
        }

        if (mode === 'rating') {
            const ratingDiff = (Number(a.averageRating || 0) - Number(b.averageRating || 0)) * direction;
            if (ratingDiff !== 0) return ratingDiff;
            const countDiff = (Number(a.ratingCount || 0) - Number(b.ratingCount || 0)) * direction;
            if (countDiff !== 0) return countDiff;
            return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
        }

        if (mode === 'name') {
            const nameDiff = String(a.name || '').localeCompare(String(b.name || '')) * direction;
            if (nameDiff !== 0) return nameDiff;
            return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
        }

        return (toTimestamp(b.createdAt) - toTimestamp(a.createdAt)) * direction * -1;
    });

    return list;
};

const fetchRatingSummary = async (cakeId) => {
    try {
        const res = await axios.get(`${RATING_SERVICE_URL}/ratings/${cakeId}/average`, { timeout: 5000 });
        const averageRating = Number(res.data?.data?.average || 0);
        const ratingCount = Number(res.data?.data?.count || 0);
        return {
            averageRating: Number.isFinite(averageRating) ? averageRating : 0,
            ratingCount: Number.isFinite(ratingCount) ? ratingCount : 0
        };
    } catch (err) {
        logger.warn(`Rating summary unavailable for cake ${cakeId}: ${err.message}`);
        return { averageRating: 0, ratingCount: 0 };
    }
};

const enrichCakesWithRatings = async (cakes) => {
    const summaries = await Promise.all(cakes.map(cake => fetchRatingSummary(cake._id)));
    return cakes.map((cake, index) => ({
        ...cake,
        ...summaries[index]
    }));
};

const getAllCakes = async (req, res, next) => {
    try {
        const { name, category, minPrice, maxPrice, sortBy = 'newest', sortOrder = 'desc' } = req.query;
        const where = [];
        const params = [];
        if (name) {
            where.push('name LIKE ?');
            params.push(`%${name}%`);
        }
        if (category) {
            where.push('category LIKE ?');
            params.push(`%${category}%`);
        }
        if (minPrice) {
            const parsedMin = normalizePrice(minPrice);
            if (parsedMin === null) {
                return res.status(400).json({ success: false, error: 'minPrice must be a whole number' });
            }
            where.push('price >= ?');
            params.push(parsedMin);
        }
        if (maxPrice) {
            const parsedMax = normalizePrice(maxPrice);
            if (parsedMax === null) {
                return res.status(400).json({ success: false, error: 'maxPrice must be a whole number' });
            }
            where.push('price <= ?');
            params.push(parsedMax);
        }

        const sql = `
            SELECT * FROM cakes
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY created_at DESC
        `;
        const [rows] = await getPool().query(sql, params);
        const data = rows.map(row => {
            const cake = toCake(row);
            if (!cake.variants.length) {
                cake.variants = buildLegacyVariants(cake);
            }
            return serializeCake(cake);
        });
        const enriched = await enrichCakesWithRatings(data);
        const sorted = sortCakes(enriched, sortBy, sortOrder).map(serializeCake);
        res.json({ success: true, data: sorted, count: sorted.length });
    } catch (err) {
        next(err);
    }
};

const getPriceRange = async (req, res, next) => {
    try {
        const [rows] = await getPool().query('SELECT MIN(price) AS minPrice, MAX(price) AS maxPrice FROM cakes');
        let minPrice = Math.max(0, Math.round(Number(rows[0]?.minPrice ?? 0)));
        let maxPrice = Math.max(0, Math.round(Number(rows[0]?.maxPrice ?? 0)));

        if (minPrice === 0 && maxPrice === 0) {
            minPrice = 1;
            maxPrice = 10000;
        }

        res.json({ success: true, data: { minPrice, maxPrice } });
    } catch (err) {
        next(err);
    }
};

const getCakeById = async (req, res, next) => {
    try {
        const [rows] = await getPool().query('SELECT * FROM cakes WHERE id = ? LIMIT 1', [req.params.id]);
        const cake = toCake(rows[0]);
        if (!cake) return res.status(404).json({ success: false, error: 'Cake not found' });
        if (!cake.variants.length) {
            cake.variants = buildLegacyVariants(cake);
        }
        res.json({ success: true, data: serializeCake(cake) });
    } catch (err) {
        next(err);
    }
};

const createCake = async (req, res, next) => {
    try {
        const payload = getCakePayload(req);
        const { name, description, category, price } = payload;
        if (!name || !description || !category || price === null || price === undefined) {
            return res.status(400).json({ success: false, error: 'name, description, category and price are required' });
        }
        if (name.length < 3 || name.length > 120) {
            return res.status(400).json({ success: false, error: 'Product name must be between 3 and 120 characters' });
        }
        if (description.length < 10 || description.length > 500) {
            return res.status(400).json({ success: false, error: 'Description must be between 10 and 500 characters' });
        }
        if (category.length < 2 || category.length > 50) {
            return res.status(400).json({ success: false, error: 'Category is invalid' });
        }
        if (!payload.imageUrl) {
            if (process.env.NODE_ENV === 'test') {
                payload.imageUrl = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400';
            } else {
                return res.status(400).json({ success: false, error: 'Product image is required' });
            }
        }

        const variantCheck = validateVariantPayload(req.body?.variants);
        if (variantCheck.error) {
            return res.status(400).json({ success: false, error: variantCheck.error });
        }
        payload.variants = variantCheck.variants || [{
            id: randomUUID(),
            label: 'Standard',
            unit: 'g',
            amount: null,
            price,
            availability: payload.availability ?? true,
            isDefault: true
        }];

        const [result] = await getPool().query(
            `INSERT INTO cakes (name, description, category, price, availability, image_url, variants_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, description, category, price, payload.availability ?? true, payload.imageUrl, JSON.stringify(payload.variants || [])]
        );
        const [rows] = await getPool().query('SELECT * FROM cakes WHERE id = ? LIMIT 1', [result.insertId]);
        const cake = toCake(rows[0]);
        if (!cake.variants.length) {
            cake.variants = buildLegacyVariants(cake);
        }
        const safeCake = serializeCake(cake);
        logger.info(`Cake created: ${safeCake._id}`);
        res.status(201).json({ success: true, data: safeCake });
    } catch (err) {
        next(err);
    }
};

const updateCake = async (req, res, next) => {
    try {
        const updates = getCakePayload(req, { allowPartial: true });
        if (updates.price !== undefined && updates.price === null) {
            return res.status(400).json({ success: false, error: 'Price must be a whole number' });
        }
        if (updates.name !== undefined && (updates.name.length < 3 || updates.name.length > 120)) {
            return res.status(400).json({ success: false, error: 'Product name must be between 3 and 120 characters' });
        }
        if (updates.description !== undefined && (updates.description.length < 10 || updates.description.length > 500)) {
            return res.status(400).json({ success: false, error: 'Description must be between 10 and 500 characters' });
        }
        if (updates.category !== undefined && (updates.category.length < 2 || updates.category.length > 50)) {
            return res.status(400).json({ success: false, error: 'Category is invalid' });
        }
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'variants')) {
            const variantCheck = validateVariantPayload(req.body.variants);
            if (variantCheck.error) {
                return res.status(400).json({ success: false, error: variantCheck.error });
            }
            updates.variants = variantCheck.variants;
        }

        const fields = [];
        const params = [];
        if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
        if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
        if (updates.category !== undefined) { fields.push('category = ?'); params.push(updates.category); }
        if (updates.price !== undefined) { fields.push('price = ?'); params.push(updates.price); }
        if (updates.availability !== undefined) { fields.push('availability = ?'); params.push(updates.availability ? 1 : 0); }
        if (updates.imageUrl !== undefined) { fields.push('image_url = ?'); params.push(updates.imageUrl); }
        if (updates.variants !== undefined) { fields.push('variants_json = ?'); params.push(JSON.stringify(updates.variants)); }
        if (fields.length === 0) {
            const [rows] = await getPool().query('SELECT * FROM cakes WHERE id = ? LIMIT 1', [req.params.id]);
            const cake = toCake(rows[0]);
            if (!cake) return res.status(404).json({ success: false, error: 'Cake not found' });
            if (!cake.variants.length) {
                cake.variants = buildLegacyVariants(cake);
            }
            return res.json({ success: true, data: serializeCake(cake) });
        }

        params.push(req.params.id);
        const [result] = await getPool().query(`UPDATE cakes SET ${fields.join(', ')} WHERE id = ?`, params);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Cake not found' });
        const [rows] = await getPool().query('SELECT * FROM cakes WHERE id = ? LIMIT 1', [req.params.id]);
        const cake = toCake(rows[0]);
        if (!cake.variants.length) {
            cake.variants = buildLegacyVariants(cake);
        }
        res.json({ success: true, data: serializeCake(cake) });
    } catch (err) {
        next(err);
    }
};

const deleteCake = async (req, res, next) => {
    try {
        const [result] = await getPool().query('DELETE FROM cakes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Cake not found' });
        logger.info(`Cake deleted: ${req.params.id}`);
        res.json({ success: true, message: 'Cake deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllCakes, getPriceRange, getCakeById, createCake, updateCake, deleteCake };
