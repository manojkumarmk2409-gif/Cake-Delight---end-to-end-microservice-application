const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../logger');
const { getPool, toCart } = require('../db');

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3001';
const trimText = (value) => (typeof value === 'string' ? value.trim() : '');

const pickVariant = (cake, body = {}) => {
    const variants = Array.isArray(cake?.variants) ? cake.variants : [];
    const requestedId = typeof body.variantId === 'string' ? body.variantId : '';
    const requestedKey = typeof body.variantKey === 'string' ? body.variantKey : '';

    if (variants.length === 0) {
        return {
            id: 'legacy',
            key: `${cake._id}:legacy`,
            label: 'Standard',
            unit: 'g',
            amount: null,
            price: Number(cake.price),
            availability: cake.availability !== false,
            isDefault: true
        };
    }

    const match = variants.find(variant => {
        if (requestedId && String(variant.id) === requestedId) return true;
        if (requestedKey && `${cake._id}:${variant.id}` === requestedKey) return true;
        return false;
    }) || variants.find(variant => variant.isDefault) || variants[0];

    if (!match) return null;
    if (match.availability === false) return null;

    return {
        id: String(match.id),
        key: `${cake._id}:${match.id}`,
        label: match.label,
        unit: match.unit || 'g',
        amount: match.amount ?? null,
        price: Number(match.price ?? cake.price),
        availability: match.availability !== false,
        isDefault: Boolean(match.isDefault)
    };
};

const loadCart = async (userId) => {
    const [rows] = await getPool().query('SELECT * FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    return toCart(rows[0]);
};

const upsertCart = async (userId, items) => {
    await getPool().query(
        `INSERT INTO carts (user_id, items)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE items = VALUES(items)`,
        [userId, JSON.stringify(items)]
    );
    return loadCart(userId);
};

exports.testEndpoint = (req, res) => res.json({ ok: true });

exports.getCart = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let cart = await loadCart(userId);
        if (!cart) {
            cart = await upsertCart(userId, []);
        }
        res.json(cart);
    } catch (err) {
        next(err);
    }
};

exports.addItem = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const cakeId = trimText(req.body?.cakeId);
        const quantity = req.body?.quantity;
        const parsedQuantity = Number(quantity);
        if (!cakeId || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ error: 'Invalid cakeId or quantity' });
        }
        if (parsedQuantity > 999) {
            return res.status(400).json({ error: 'Quantity must be 999 or less' });
        }

        let cake;
        try {
            const response = await axios.get(`${CATALOG_URL}/cakes/${cakeId}`);
            cake = response.data.data || response.data;
        } catch (err) {
            logger.error(`Error fetching cake ${cakeId} from catalog: ${err.message}`);
            return res.status(400).json({ error: 'Invalid cakeId' });
        }

        const selectedVariant = pickVariant(cake, req.body);
        if (!selectedVariant) {
            return res.status(400).json({ error: 'Invalid product variant' });
        }

        const cart = await loadCart(userId) || { userId, items: [] };
        const existingItem = cart.items.find(item =>
            String(item.cakeId) === String(cakeId) && String(item.variantKey || '') === String(selectedVariant.key)
        );
        if (existingItem) {
            existingItem.quantity += parsedQuantity;
        } else {
            cart.items.push({
                cakeId,
                name: cake.name,
                price: Number(selectedVariant.price),
                quantity: parsedQuantity,
                variantId: selectedVariant.id,
                variantKey: selectedVariant.key,
                variantLabel: selectedVariant.label,
                variantUnit: selectedVariant.unit,
                variantAmount: selectedVariant.amount
            });
        }

        const saved = await upsertCart(userId, cart.items);
        res.status(201).json(saved);
    } catch (err) {
        next(err);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const cakeId = trimText(req.params.cakeId);
        const variantKey = trimText(req.body?.variantKey);
        const parsedQuantity = Number(req.body.quantity);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        if (parsedQuantity > 999) {
            return res.status(400).json({ error: 'Quantity must be 999 or less' });
        }

        const cart = await loadCart(userId);
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        const item = cart.items.find(item =>
            String(item.cakeId) === String(cakeId) &&
            (variantKey ? String(item.variantKey || '') === variantKey : true)
        );
        if (!item) return res.status(404).json({ error: 'Item not in cart' });

        item.quantity = parsedQuantity;
        const saved = await upsertCart(userId, cart.items);
        res.json(saved);
    } catch (err) {
        next(err);
    }
};

exports.removeItem = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const cakeId = trimText(req.params.cakeId);
        const variantKey = trimText(req.query?.variantKey);
        const cart = await loadCart(userId);
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        const initialCount = cart.items.length;
        cart.items = cart.items.filter(item =>
            !(String(item.cakeId) === String(cakeId) && (variantKey ? String(item.variantKey || '') === variantKey : true))
        );
        if (cart.items.length === initialCount) {
            return res.status(404).json({ error: 'Item not in cart' });
        }

        const saved = await upsertCart(userId, cart.items);
        res.json(saved);
    } catch (err) {
        next(err);
    }
};

exports.clearCart = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await upsertCart(userId, []);
        res.json({ message: 'Cart cleared' });
    } catch (err) {
        next(err);
    }
};
