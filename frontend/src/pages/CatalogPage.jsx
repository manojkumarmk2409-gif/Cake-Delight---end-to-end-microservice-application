import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addToBasket, getBasket, getCatalogPriceRange, getCakes } from '../services/api.js';
import { useBasket } from '../context/BasketContext.jsx';
import { getStoredToken } from '../utils/auth.js';
import { formatCurrency } from '../utils/format.js';
import useAutoRefresh from '../hooks/useAutoRefresh.js';
import { trimText } from '../utils/validation.js';

const CATEGORIES = ['All', 'Chocolate', 'Fruit', 'Classic', 'Citrus', 'Cheesecake', 'Caramel', 'Specialty'];
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'rating_desc', label: 'Top Rated' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' }
];

const validateOptionalWholePrice = (value, label) => {
    if (value === '') return '';
    const number = Number(value);
    if (!Number.isFinite(number)) return `${label} must be a number`;
    if (!Number.isInteger(number)) return `${label} must be a whole number`;
    if (number < 0) return `${label} must be 0 or higher`;
    return '';
};

const clampPrice = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(Math.max(parsed, min), max);
};

const getSortParams = (sortBy) => {
    switch (sortBy) {
        case 'price_asc':
            return { sortBy: 'price', sortOrder: 'asc' };
        case 'price_desc':
            return { sortBy: 'price', sortOrder: 'desc' };
        case 'rating_desc':
            return { sortBy: 'rating', sortOrder: 'desc' };
        default:
            return { sortBy: 'newest', sortOrder: 'desc' };
    }
};

const formatRating = (value) => {
    const rating = Number(value || 0);
    return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
};

export default function CatalogPage() {
    const navigate = useNavigate();
    const { setBasket } = useBasket();
    const [cakes, setCakes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        name: '',
        category: 'All',
        minPrice: '',
        maxPrice: '',
        sortBy: 'newest'
    });
    const [filterErrors, setFilterErrors] = useState({});
    const [adding, setAdding] = useState({});
    const [priceBounds, setPriceBounds] = useState({ min: 1, max: 10000, ready: false });

    const hasProducts = cakes.length > 0;
    const showEmptyState = !loading && !error && !hasProducts;

    const hasFilters = useMemo(() => {
        const textFilter = Boolean(trimText(filters.name) || (filters.category && filters.category !== 'All') || filters.sortBy !== 'newest');
        const priceFilterActive = priceBounds.ready && (
            filters.minPrice !== String(priceBounds.min) ||
            filters.maxPrice !== String(priceBounds.max)
        );
        return textFilter || priceFilterActive;
    }, [filters, priceBounds]);

    const loadPriceBounds = useCallback(async () => {
        try {
            const res = await getCatalogPriceRange();
            const min = Math.max(1, Number(res.data.data?.minPrice ?? 1));
            const max = Math.max(min, Number(res.data.data?.maxPrice ?? 0));
            setPriceBounds({ min, max, ready: true });
            setFilters(prev => ({
                ...prev,
                minPrice: String(min),
                maxPrice: String(max)
            }));
        } catch {
            setPriceBounds({ min: 1, max: 10000, ready: false });
        }
    }, []);

    useEffect(() => {
        loadPriceBounds();
    }, [loadPriceBounds]);

    const fetchCakes = useCallback(async () => {
        if (priceBounds.ready && filters.minPrice && filters.maxPrice) {
            const nextErrors = {
                minPrice: validateOptionalWholePrice(filters.minPrice, 'Min price'),
                maxPrice: validateOptionalWholePrice(filters.maxPrice, 'Max price')
            };

            if (!nextErrors.minPrice && !nextErrors.maxPrice) {
                const min = Number(filters.minPrice);
                const max = Number(filters.maxPrice);
                if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
                    nextErrors.maxPrice = 'Max price must be greater than or equal to Min price';
                }
            }

            setFilterErrors(nextErrors);
            if (nextErrors.minPrice || nextErrors.maxPrice) {
                setError(nextErrors.minPrice || nextErrors.maxPrice);
                setLoading(false);
                return;
            }
        } else {
            setFilterErrors({});
        }

        setLoading(true);
        setError('');
        try {
            const params = {};
            const name = trimText(filters.name);
            if (name) params.name = name;
            if (filters.category && filters.category !== 'All') params.category = filters.category;

            if (priceBounds.ready) {
                params.minPrice = filters.minPrice;
                params.maxPrice = filters.maxPrice;
            }

            const { sortBy, sortOrder } = getSortParams(filters.sortBy);
            params.sortBy = sortBy;
            params.sortOrder = sortOrder;

            const res = await getCakes(params);
            setCakes(res.data.data || []);
        } catch {
            setError('Failed to load products. Please check the backend connection.');
        } finally {
            setLoading(false);
        }
    }, [filters, priceBounds]);

    useEffect(() => {
        const t = setTimeout(fetchCakes, 250);
        return () => clearTimeout(t);
    }, [fetchCakes]);

    useAutoRefresh(fetchCakes, 45000);

    const handleAddToCart = async (e, cake) => {
        e.stopPropagation();
        if (!cake.availability) return;
        if (!getStoredToken()) {
            navigate('/login');
            return;
        }

        if (Array.isArray(cake.variants) && cake.variants.length > 0) {
            navigate(`/cakes/${cake._id}`);
            return;
        }

        setAdding(prev => ({ ...prev, [cake._id]: true }));
        try {
            await addToBasket({ cakeId: cake._id, name: cake.name, price: cake.price, quantity: 1 });
            const res = await getBasket();
            setBasket(res.data.items || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not add to basket');
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setAdding(prev => ({ ...prev, [cake._id]: false }));
        }
    };

    const clearFilters = () => {
        setFilters(prev => ({
            ...prev,
            name: '',
            category: 'All',
            minPrice: priceBounds.ready ? String(priceBounds.min) : '',
            maxPrice: priceBounds.ready ? String(priceBounds.max) : '',
            sortBy: 'newest'
        }));
        setFilterErrors({});
    };

    const onMinPriceChange = (value) => {
        const nextMin = clampPrice(value, priceBounds.min, Number(filters.maxPrice || priceBounds.max));
        setFilters(prev => ({ ...prev, minPrice: String(nextMin) }));
        setFilterErrors(prev => ({ ...prev, minPrice: '' }));
    };

    const onMaxPriceChange = (value) => {
        const nextMax = clampPrice(value, Number(filters.minPrice || priceBounds.min), priceBounds.max);
        setFilters(prev => ({ ...prev, maxPrice: String(nextMax) }));
        setFilterErrors(prev => ({ ...prev, maxPrice: '' }));
    };

    const priceRangeSummary = showEmptyState
        ? 'No products found yet.'
        : priceBounds.ready
            ? 'Slide to narrow the catalog by the live database range.'
            : 'Loading live price range from the database...';

    const selectedMin = formatCurrency(Number(filters.minPrice || priceBounds.min));
    const selectedMax = formatCurrency(Number(filters.maxPrice || priceBounds.max));

    return (
        <main className="page">
            <div className="container">
                <div className="hero">
                    <h1>Artisan Cakes, <br />Delivered with Love</h1>
                    <p>Browse our handcrafted collection of premium cakes for every occasion.</p>
                    <div className="hero-actions">
                        <span className="summary-pill">{cakes.length} cakes ready to browse</span>
                        {hasFilters && <span className="summary-pill summary-pill-accent">Filters active</span>}
                    </div>
                </div>

                <div className="catalog-layout">
                    <aside className="catalog-filter-panel">
                        <div className="catalog-filter-stack">
                            <div className="form-group catalog-search-group">
                                <label className="form-label">Search</label>
                                <input
                                    className="form-input"
                                    placeholder="Cake name..."
                                    value={filters.name}
                                    onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={filters.category}
                                    onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                >
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sort</label>
                                <select
                                    className="form-select"
                                    value={filters.sortBy}
                                    onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                                >
                                    {SORT_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            {priceBounds.ready && !showEmptyState && (
                                <div className="price-range-panel">
                                    <div className="price-range-sliders">
                                        <input
                                            className="price-slider"
                                            type="range"
                                            min={priceBounds.min}
                                            max={priceBounds.max}
                                            step="1"
                                            value={filters.minPrice}
                                            onChange={e => onMinPriceChange(e.target.value)}
                                            title="Minimum price"
                                        />
                                        <input
                                            className="price-slider"
                                            type="range"
                                            min={priceBounds.min}
                                            max={priceBounds.max}
                                            step="1"
                                            value={filters.maxPrice}
                                            onChange={e => onMaxPriceChange(e.target.value)}
                                            title="Maximum price"
                                        />
                                    </div>
                                    <div className="price-range-values">
                                        <div className="price-range-value">
                                            <span className="price-range-value-label">Min</span>
                                            <strong>{selectedMin}</strong>
                                        </div>
                                        <div className="price-range-value">
                                            <span className="price-range-value-label">Max</span>
                                            <strong>{selectedMax}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {filterErrors.minPrice && <div className="form-error" style={{ fontSize: '0.75rem' }}>{filterErrors.minPrice}</div>}
                            {filterErrors.maxPrice && <div className="form-error" style={{ fontSize: '0.75rem' }}>{filterErrors.maxPrice}</div>}

                            <button className="btn btn-secondary btn-sm catalog-clear-btn" onClick={clearFilters}>
                                Clear
                            </button>
                        </div>
                    </aside>

                    <section>
                        {loading && <div className="loading"><div className="spinner" /></div>}
                        {error && <div className="alert alert-error">{error}</div>}

                        {showEmptyState && (
                            <div className="empty-state">
                                <div className="empty-state-icon">🔍</div>
                                <h3>No products found</h3>
                                <p>
                                    {hasFilters
                                        ? 'Try adjusting your search, category, sort, or price range filters.'
                                        : 'There are no products in the catalog yet.'}
                                </p>
                            </div>
                        )}

                        <div className="cake-grid">
                            {cakes.map(cake => (
                                <div key={cake._id} className="card cake-card" onClick={() => navigate(`/cakes/${cake._id}`)}>
                                    <img
                                        className="cake-card-img"
                                        src={cake.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'}
                                        alt={cake.name}
                                    />
                                    <div className="cake-card-body">
                                        <div className="cake-card-category">{cake.category}</div>
                                        <div className="cake-card-name">{cake.name}</div>
                                        <div className="cake-rating-row">
                                            <span className="cake-rating-stars" aria-hidden="true">
                                                {'★'.repeat(Math.max(0, Math.round(Number(cake.averageRating || 0))))}
                                                {'☆'.repeat(Math.max(0, 5 - Math.round(Number(cake.averageRating || 0))))}
                                            </span>
                                            <span className="cake-rating-text">
                                                {formatRating(cake.averageRating)} / 5
                                                <span className="cake-rating-count"> ({Number(cake.ratingCount || 0)} reviews)</span>
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                                            {(cake.description || 'Handcrafted with premium ingredients.').substring(0, 70)}...
                                        </p>
                                        <div className="cake-card-footer">
                                            <div>
                                                <span className="cake-price">{formatCurrency(cake.price)}</span>
                                                {cake.variants?.length > 0 && (
                                                    <div className="cake-variant-hint">
                                                        {cake.variants.length} size{cake.variants.length !== 1 ? 's' : ''} available
                                                    </div>
                                                )}
                                            </div>
                                            {cake.availability ? (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    disabled={adding[cake._id]}
                                                    onClick={(e) => handleAddToCart(e, cake)}
                                                >
                                                    {adding[cake._id] ? '...' : (cake.variants?.length > 0 ? 'Choose Size' : '+ Basket')}
                                                </button>
                                            ) : (
                                                <span className="badge-unavailable">Unavailable</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
