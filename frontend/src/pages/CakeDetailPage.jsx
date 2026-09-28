import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCakeById, getRatings, getRatingAverage, submitRating, addToBasket, getBasket } from '../services/api.js';
import { useBasket } from '../context/BasketContext.jsx';
import { getStoredToken } from '../utils/auth.js';
import { formatCurrency } from '../utils/format.js';
import useAutoRefresh from '../hooks/useAutoRefresh.js';
import { validateComment } from '../utils/validation.js';

function StarSelector({ value, onChange }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="stars">
            {[1, 2, 3, 4, 5].map(s => (
                <span
                    key={s}
                    className={`star ${(hover || value) >= s ? 'star-filled' : 'star-empty'}`}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(s)}
                >
                    ★
                </span>
            ))}
        </div>
    );
}

const buildVariantList = (cake) => {
    if (!cake) return [];
    if (Array.isArray(cake.variants) && cake.variants.length > 0) return cake.variants;
    return [{
        id: `legacy-${cake._id}`,
        label: 'Standard',
        unit: 'g',
        amount: null,
        price: cake.price,
        availability: cake.availability,
        isDefault: true
    }];
};

export default function CakeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setBasket } = useBasket();
    const [cake, setCake] = useState(null);
    const [ratings, setRatings] = useState([]);
    const [average, setAverage] = useState({ average: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState({ score: 0, comment: '' });
    const [ratingStatus, setRatingStatus] = useState('');
    const [ratingErrors, setRatingErrors] = useState({});
    const [adding, setAdding] = useState(false);
    const [addStatus, setAddStatus] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [cakeRes, ratingsRes, avgRes] = await Promise.all([
                getCakeById(id),
                getRatings(id),
                getRatingAverage(id)
            ]);
            const nextCake = cakeRes.data.data;
            setCake(nextCake);
            setRatings(ratingsRes.data.data);
            setAverage(avgRes.data.data);
            const variants = buildVariantList(nextCake);
            setSelectedVariantId(variants.find(v => v.isDefault)?.id || variants[0]?.id || '');
        } catch {
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    useAutoRefresh(() => {
        if (!cake) return;
        load();
    }, 45000);

    const variants = useMemo(() => buildVariantList(cake), [cake]);
    const selectedVariant = variants.find(v => String(v.id) === String(selectedVariantId)) || variants[0];
    const selectedPrice = selectedVariant?.price ?? cake?.price ?? 0;
    const canAdd = Boolean(cake?.availability && selectedVariant?.availability !== false);

    const handleAddToCart = async () => {
        if (!canAdd) return;
        if (!getStoredToken()) {
            navigate('/login');
            return;
        }
        setAdding(true);
        try {
            await addToBasket({
                cakeId: cake._id,
                name: cake.name,
                price: selectedPrice,
                quantity: 1,
                variantId: selectedVariant?.id,
                variantKey: selectedVariant?.id ? `${cake._id}:${selectedVariant.id}` : undefined,
                variantLabel: selectedVariant?.label,
                variantUnit: selectedVariant?.unit,
                variantAmount: selectedVariant?.amount
            });
            const res = await getBasket();
            setBasket(res.data.items || []);
            setAddStatus('Added to basket!');
            setTimeout(() => setAddStatus(''), 3000);
        } catch {
            setAddStatus('Failed to add');
        } finally {
            setAdding(false);
        }
    };

    const handleSubmitRating = async (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (rating.score < 1 || rating.score > 5) nextErrors.score = 'Please select a score from 1 to 5';
        const commentError = validateComment(rating.comment);
        if (commentError) nextErrors.comment = commentError;
        setRatingErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        if (!getStoredToken()) {
            navigate('/login');
            return;
        }
        try {
            await submitRating({ cakeId: id, score: rating.score, comment: rating.comment });
            setRatingStatus('Rating submitted!');
            const [ratingsRes, avgRes] = await Promise.all([getRatings(id), getRatingAverage(id)]);
            setRatings(ratingsRes.data.data);
            setAverage(avgRes.data.data);
            setRating({ score: 0, comment: '' });
            setRatingErrors({});
        } catch (err) {
            setRatingStatus(err.response?.data?.error || 'Failed to submit rating');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;
    if (!cake) return null;

    return (
        <main className="page">
            <div className="container">
                <button className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }} onClick={() => navigate(-1)}>
                    Back
                </button>
                <div className="cake-detail-grid">
                    <div>
                        <img
                            className="cake-detail-img"
                            src={cake.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'}
                            alt={cake.name}
                        />
                    </div>
                    <div>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                            {cake.category}
                        </div>
                        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem', fontSize: '2rem' }}>{cake.name}</h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.7 }}>{cake.description}</p>

                        <div className="variant-selector">
                            {variants.map(variant => (
                                <button
                                    key={variant.id}
                                    type="button"
                                    className={`variant-chip ${String(selectedVariantId) === String(variant.id) ? 'variant-chip-active' : ''}`}
                                    onClick={() => setSelectedVariantId(variant.id)}
                                >
                                    <span>{variant.label}</span>
                                    <small>
                                        {variant.amount ? `${variant.amount}${variant.unit}` : variant.unit}
                                    </small>
                                    <strong>{formatCurrency(variant.price)}</strong>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
                            <span className="cake-price" style={{ fontSize: '2rem' }}>{formatCurrency(selectedPrice)}</span>
                            {(!cake.availability || selectedVariant?.availability === false) && <span className="badge-unavailable">Unavailable</span>}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <div className="stars">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} className={`star ${average.average >= s ? 'star-filled' : 'star-empty'}`}>★</span>
                                ))}
                            </div>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {average.average.toFixed(1)} ({average.count} reviews)
                            </span>
                        </div>

                        {canAdd ? (
                            <button className="btn btn-primary" onClick={handleAddToCart} disabled={adding}>
                                {adding ? 'Adding...' : 'Add to Basket'}
                            </button>
                        ) : (
                            <button className="btn btn-secondary" disabled>Unavailable</button>
                        )}
                        {addStatus && <div className={`alert ${addStatus.includes('Failed') ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '1rem' }}>{addStatus}</div>}

                        <div className="rating-form">
                            <h3 style={{ marginBottom: '1rem' }}>Rate this Cake</h3>
                            <form onSubmit={handleSubmitRating}>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">Your Score</label>
                                    <StarSelector value={rating.score} onChange={s => setRating(r => ({ ...r, score: s }))} />
                                    {ratingErrors.score && <div className="form-error">{ratingErrors.score}</div>}
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">Comment (optional)</label>
                                    <input
                                        className={`form-input ${ratingErrors.comment ? 'input-error' : ''}`}
                                        placeholder="Share your experience..."
                                        value={rating.comment}
                                        onChange={e => {
                                            setRating(r => ({ ...r, comment: e.target.value }));
                                            setRatingErrors(prev => ({ ...prev, comment: '' }));
                                        }}
                                        maxLength="500"
                                    />
                                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {rating.comment.length}/500
                                    </div>
                                    {ratingErrors.comment && <div className="form-error">{ratingErrors.comment}</div>}
                                </div>
                                {ratingStatus && <div className={`alert ${ratingStatus.includes('Failed') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>{ratingStatus}</div>}
                                <button className="btn btn-primary btn-sm" type="submit">Submit Rating</button>
                            </form>
                        </div>
                    </div>
                </div>

                {ratings.length > 0 && (
                    <div className="rating-list" style={{ marginTop: '3rem' }}>
                        <h2 style={{ marginBottom: '1rem' }}>Customer Reviews</h2>
                        {ratings.map(r => (
                            <div key={r._id} className="rating-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                    <div className="stars">
                                        {[1, 2, 3, 4, 5].map(s => <span key={s} className={`star ${r.score >= s ? 'star-filled' : 'star-empty'}`}>★</span>)}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        by {r.userId} · {new Date(r.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {r.comment && <p style={{ fontSize: '0.9rem' }}>{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
