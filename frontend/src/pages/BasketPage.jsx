import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBasket, updateBasketItem, removeFromBasket, checkout } from '../services/api.js';
import { useBasket } from '../context/BasketContext.jsx';
import { formatCurrency } from '../utils/format.js';
import { normalizeDiscountCode, validateAddress, validateDiscountCode } from '../utils/validation.js';

export default function BasketPage() {
    const navigate = useNavigate();
    const { setBasket, clearBasket } = useBasket();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [discountCode, setDiscountCode] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [syncingKey, setSyncingKey] = useState('');

    const total = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);

    const fetchBasket = useCallback(async ({ silent = true } = {}) => {
        if (!silent) {
            setLoading(true);
        }
        setError('');
        try {
            const res = await getBasket();
            const basketItems = res.data?.items || res.data?.data?.items || [];
            setItems(basketItems);
            setBasket(basketItems);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
                return;
            }
            if (!silent) {
                setError('Failed to load basket');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [navigate, setBasket]);

    useEffect(() => {
        fetchBasket({ silent: false });
    }, [fetchBasket]);

    const handleUpdate = async (cakeId, quantity, variantKey) => {
        const itemKey = `${cakeId}-${variantKey || 'legacy'}`;
        const nextItems = items.map(item => (
            String(item.cakeId) === String(cakeId) && String(item.variantKey || '') === String(variantKey || '')
                ? { ...item, quantity }
                : item
        )).filter(item => item.quantity > 0);
        setItems(nextItems);
        setBasket(nextItems);
        setError('');
        setSyncingKey(itemKey);
        try {
            const res = await updateBasketItem(cakeId, quantity, variantKey);
            const basketItems = res.data?.items || res.data?.data?.items || nextItems;
            setItems(basketItems);
            setBasket(basketItems);
        } catch (err) {
            await fetchBasket({ silent: true });
            setError(err.response?.data?.error || 'Update failed');
        } finally {
            setSyncingKey('');
        }
    };

    const handleRemove = async (cakeId, variantKey) => {
        const itemKey = `${cakeId}-${variantKey || 'legacy'}`;
        const nextItems = items.filter(item => !(
            String(item.cakeId) === String(cakeId) &&
            String(item.variantKey || '') === String(variantKey || '')
        ));
        setItems(nextItems);
        setBasket(nextItems);
        setError('');
        setSyncingKey(itemKey);
        try {
            await removeFromBasket(cakeId, variantKey);
        } catch (err) {
            await fetchBasket({ silent: true });
            setError(err.response?.data?.error || 'Remove failed');
        } finally {
            setSyncingKey('');
        }
    };

    const handleCheckout = async () => {
        setCheckingOut(true);
        setError('');
        const nextErrors = {
            discountCode: validateDiscountCode(discountCode),
            address: validateAddress(address)
        };
        setFieldErrors(nextErrors);
        try {
            if (nextErrors.discountCode || nextErrors.address) {
                return;
            }
            const res = await checkout({
                discountCode: normalizeDiscountCode(discountCode),
                address: address.trim()
            });
            clearBasket();
            navigate('/checkout/confirm', { state: { order: res.data.data } });
        } catch (err) {
            setError(err.response?.data?.error || 'Checkout failed');
        } finally {
            setCheckingOut(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <main className="page">
            <div className="container">
                <h1 className="page-title">Your Basket</h1>
                {error && <div className="alert alert-error">{error}</div>}

                {items.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🛒</div>
                        <h3>Your basket is empty</h3>
                        <p style={{ marginBottom: '1.5rem' }}>Add some delicious cakes first!</p>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Cakes</button>
                    </div>
                ) : (
                    <div className="basket-layout">
                        <div className="basket-items">
                            {items.map(item => (
                                <div key={`${item.cakeId}-${item.variantKey || 'legacy'}`} className="basket-item">
                                    <div className="basket-item-info">
                                        <div className="basket-item-name">{item.name}</div>
                                        <div className="basket-item-price">
                                            {item.variantLabel ? `${item.variantLabel} · ` : ''}
                                            {formatCurrency(item.price)}
                                        </div>
                                        {item.variantAmount ? (
                                            <div className="basket-item-meta">
                                                {item.variantAmount}{item.variantUnit || 'g'}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div className="qty-controls">
                                            <button
                                                className="qty-btn"
                                                onClick={() => item.quantity > 1
                                                    ? handleUpdate(item.cakeId, item.quantity - 1, item.variantKey)
                                                    : handleRemove(item.cakeId, item.variantKey)}
                                                disabled={syncingKey === `${item.cakeId}-${item.variantKey || 'legacy'}`}
                                                title="Decrease quantity or remove"
                                            >
                                                −
                                            </button>
                                            <span className="qty-value">{item.quantity}x</span>
                                            <button
                                                className="qty-btn"
                                                onClick={() => handleUpdate(item.cakeId, item.quantity + 1, item.variantKey)}
                                                disabled={syncingKey === `${item.cakeId}-${item.variantKey || 'legacy'}`}
                                                title="Increase quantity"
                                            >
                                                +
                                            </button>
                                            <span style={{ flex: 1, textAlign: 'right', fontWeight: 700, color: 'var(--color-secondary)' }}>
                                                {formatCurrency(item.price * item.quantity)}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleRemove(item.cakeId, item.variantKey)}
                                            disabled={syncingKey === `${item.cakeId}-${item.variantKey || 'legacy'}`}
                                            style={{ width: '100%' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="basket-total">
                            <h3 style={{ marginBottom: '1rem' }}>Order Summary</h3>
                            <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {items.length} item{items.length !== 1 ? 's' : ''} ready for checkout
                            </div>
                            {items.map(i => (
                                <div key={`${i.cakeId}-${i.variantKey || 'legacy'}`} className="basket-total-row">
                                    <span>
                                        {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''} × {i.quantity}
                                    </span>
                                    <span>{formatCurrency(i.price * i.quantity)}</span>
                                </div>
                            ))}
                            <div className="basket-total-row grand">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <input
                                    className={`form-input ${fieldErrors.discountCode ? 'input-error' : ''}`}
                                    placeholder="Discount Code (e.g. CAKE10)"
                                    value={discountCode}
                                    onChange={e => {
                                        setDiscountCode(e.target.value.toUpperCase());
                                        setFieldErrors(prev => ({ ...prev, discountCode: '' }));
                                    }}
                                    maxLength="20"
                                />
                                {fieldErrors.discountCode && <div className="form-error">{fieldErrors.discountCode}</div>}
                            </div>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <textarea
                                    className={`form-input ${fieldErrors.address ? 'input-error' : ''}`}
                                    placeholder="Delivery Address"
                                    value={address}
                                    onChange={e => {
                                        setAddress(e.target.value);
                                        setFieldErrors(prev => ({ ...prev, address: '' }));
                                    }}
                                    required
                                    minLength="10"
                                    maxLength="240"
                                    rows="3"
                                />
                                {fieldErrors.address && <div className="form-error">{fieldErrors.address}</div>}
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '1.25rem' }}
                                onClick={handleCheckout}
                                disabled={checkingOut}
                            >
                                {checkingOut ? 'Processing...' : 'Checkout'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
