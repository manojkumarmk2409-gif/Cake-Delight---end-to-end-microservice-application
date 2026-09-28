import { useEffect, useMemo, useState } from 'react';
import { getOrders, getCakes, createCake, updateCake, updateOrderStatus } from '../services/api.js';
import { formatCurrency } from '../utils/format.js';
import { getCurrentUser } from '../utils/auth.js';
import { canManageOrders, canEditProducts, canCreateProducts } from '../utils/roles.js';
import useAutoRefresh from '../hooks/useAutoRefresh.js';
import { trimText, validatePrice, validateUrl } from '../utils/validation.js';

const CATEGORY_OPTIONS = ['Classic', 'Chocolate', 'Fruit', 'Citrus', 'Cheesecake', 'Caramel', 'Specialty'];
const VARIANT_UNITS = ['g', 'kg', 'ml', 'l', 'pcs'];

const createVariantRow = (overrides = {}) => ({
    id: overrides.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: overrides.label || 'Standard',
    unit: overrides.unit || 'g',
    amount: overrides.amount ?? '',
    price: overrides.price ?? '',
    availability: overrides.availability ?? true,
    isDefault: overrides.isDefault ?? true
});

const normalizeVariants = (variants, fallbackPrice = '') => {
    const list = Array.isArray(variants) && variants.length > 0 ? variants : [createVariantRow({ price: fallbackPrice })];
    return list.map((variant, index) => ({
        id: variant.id || `${Date.now()}-${index}`,
        label: variant.label || `Variant ${index + 1}`,
        unit: variant.unit || 'g',
        amount: variant.amount === '' || variant.amount === null || variant.amount === undefined ? '' : String(variant.amount),
        price: variant.price === '' || variant.price === null || variant.price === undefined ? '' : String(variant.price),
        availability: variant.availability !== false,
        isDefault: Boolean(variant.isDefault) || index === 0
    }));
};

const makeDefaultProductForm = () => ({
    name: '',
    description: '',
    price: '',
    category: 'Classic',
    availability: true,
    imageUrl: '',
    variants: [createVariantRow()]
});

const buildVariantPayload = (variants) =>
    normalizeVariants(variants).map((variant, index) => ({
        id: variant.id,
        label: variant.label,
        unit: variant.unit,
        amount: variant.amount === '' ? null : Number(variant.amount),
        price: variant.price === '' ? null : Math.round(Number(variant.price)),
        availability: Boolean(variant.availability),
        isDefault: index === 0 || Boolean(variant.isDefault)
    }));

const updateVariantList = (list, index, field, value) =>
    list.map((variant, currentIndex) => (
        currentIndex === index ? { ...variant, [field]: value } : variant
    ));

const validateVariantRows = (variants) => {
    const list = Array.isArray(variants) ? variants : [];
    if (list.length === 0) {
        return { valid: false, errors: ['At least one variant is required.'] };
    }

    const errors = list.map((variant) => {
        const rowErrors = {};
        const label = trimText(variant.label);
        if (!label) {
            rowErrors.label = 'Variant label is required';
        } else if (label.length > 60) {
            rowErrors.label = 'Variant label must be 60 characters or less';
        }

        if (!VARIANT_UNITS.includes(String(variant.unit || '').trim())) {
            rowErrors.unit = 'Select a valid unit';
        }

        const priceError = validatePrice(variant.price, 'Variant price');
        if (priceError) {
            rowErrors.price = priceError;
        }

        if (variant.amount !== '' && variant.amount !== null && variant.amount !== undefined) {
            const amount = Number(variant.amount);
            if (!Number.isFinite(amount) || amount < 0) {
                rowErrors.amount = 'Amount must be 0 or higher';
            }
        }

        return rowErrors;
    });

    return {
        valid: errors.every(row => Object.keys(row).length === 0),
        errors
    };
};

const validateProductDraft = (draft, { requireImage = false } = {}) => {
    const errors = {};
    const normalizedName = trimText(draft.name);
    const normalizedDescription = trimText(draft.description);
    const normalizedCategory = trimText(draft.category);
    const normalizedImageUrl = trimText(draft.imageUrl);

    if (!normalizedName) {
        errors.name = 'Product name is required';
    } else if (normalizedName.length < 3) {
        errors.name = 'Product name must be at least 3 characters';
    } else if (normalizedName.length > 120) {
        errors.name = 'Product name must be 120 characters or less';
    }

    if (!normalizedDescription) {
        errors.description = 'Description is required';
    } else if (normalizedDescription.length < 10) {
        errors.description = 'Description must be at least 10 characters';
    } else if (normalizedDescription.length > 500) {
        errors.description = 'Description must be 500 characters or less';
    }

    if (!normalizedCategory) {
        errors.category = 'Category is required';
    } else if (!CATEGORY_OPTIONS.includes(normalizedCategory)) {
        errors.category = 'Select a valid category';
    }

    const variantCheck = validateVariantRows(draft.variants);
    if (!variantCheck.valid) {
        errors.variants = variantCheck.errors;
    }

    if (draft.price !== '' && draft.price !== null && draft.price !== undefined) {
        const priceError = validatePrice(draft.price, 'Base price');
        if (priceError) {
            errors.price = priceError;
        }
    }

    if (normalizedImageUrl) {
        const imageError = validateUrl(normalizedImageUrl);
        if (imageError) {
            errors.imageUrl = imageError;
        }
    } else if (requireImage && !draft.imageFile && !draft.imageUrl?.trim()) {
        errors.imageUrl = 'Product image is required';
    }

    return errors;
};

function VariantEditor({ variants, onChange, errors = [], disabled = false }) {
    return (
        <div className="variant-editor">
            <div className="image-uploader-head">
                <div>
                    <label className="form-label">Product Variants</label>
                    <p>Manage size, weight, volume, and variant pricing.</p>
                </div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onChange([...variants, createVariantRow({ isDefault: false })])}
                    disabled={disabled}
                >
                    Add Variant
                </button>
            </div>

            <div className="variant-stack">
                {variants.map((variant, index) => (
                    <div key={variant.id || index} className="variant-row">
                        <div className="admin-form-row variant-row-top">
                            <div className="form-group">
                                <label className="form-label">Label</label>
                                <input
                                    className={`form-input ${errors[index]?.label ? 'input-error' : ''}`}
                                    value={variant.label}
                                    onChange={e => onChange(updateVariantList(variants, index, 'label', e.target.value))}
                                    placeholder="500g, 1kg, 250ml..."
                                    disabled={disabled}
                                />
                                {errors[index]?.label && <div className="form-error">{errors[index].label}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Price</label>
                                <input
                                    className={`form-input ${errors[index]?.price ? 'input-error' : ''}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={variant.price}
                                    onChange={e => onChange(updateVariantList(variants, index, 'price', e.target.value))}
                                    disabled={disabled}
                                />
                                {errors[index]?.price && <div className="form-error">{errors[index].price}</div>}
                            </div>
                        </div>

                        <div className="admin-form-row variant-row-bottom">
                            <div className="form-group">
                                <label className="form-label">Amount</label>
                                <input
                                    className={`form-input ${errors[index]?.amount ? 'input-error' : ''}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={variant.amount}
                                    onChange={e => onChange(updateVariantList(variants, index, 'amount', e.target.value))}
                                    placeholder="500"
                                    disabled={disabled}
                                />
                                {errors[index]?.amount && <div className="form-error">{errors[index].amount}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Unit</label>
                                <select
                                    className={`form-select ${errors[index]?.unit ? 'input-error' : ''}`}
                                    value={variant.unit}
                                    onChange={e => onChange(updateVariantList(variants, index, 'unit', e.target.value))}
                                    disabled={disabled}
                                >
                                    {VARIANT_UNITS.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                                {errors[index]?.unit && <div className="form-error">{errors[index].unit}</div>}
                            </div>
                        </div>

                        <div className="variant-actions">
                            <label className="variant-check">
                                <input
                                    type="checkbox"
                                    checked={variant.availability}
                                    onChange={e => onChange(updateVariantList(variants, index, 'availability', e.target.checked))}
                                    disabled={disabled}
                                />
                                Available
                            </label>
                            <label className="variant-check">
                                <input
                                    type="checkbox"
                                    checked={variant.isDefault}
                                    onChange={e => onChange(updateVariantList(
                                        variants.map(v => ({ ...v, isDefault: false })),
                                        index,
                                        'isDefault',
                                        e.target.checked
                                    ))}
                                    disabled={disabled}
                                />
                                Default
                            </label>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onChange(variants.filter((_, currentIndex) => currentIndex !== index))}
                                disabled={disabled || variants.length === 1}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AdminPage() {
    const currentUser = getCurrentUser();
    const role = currentUser?.role || 'user';

    const [orders, setOrders] = useState([]);
    const [cakes, setCakes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(makeDefaultProductForm());
    const [productEdits, setProductEdits] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [formStatus, setFormStatus] = useState('');
    const [productStatus, setProductStatus] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [productErrors, setProductErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [updatingProductId, setUpdatingProductId] = useState(null);

    const orderStats = useMemo(() => {
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
        const activeOrders = orders.filter(order => ['confirmed', 'packed', 'ready_to_delivery', 'shipped'].includes(order.status)).length;
        return {
            totalOrders: orders.length,
            totalRevenue,
            activeOrders
        };
    }, [orders]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [ordersRes, cakesRes] = await Promise.all([getOrders(), getCakes()]);
            const nextOrders = ordersRes.data.data || [];
            const nextCakes = cakesRes.data.data || [];

            setOrders(nextOrders);
            setCakes(nextCakes);
            setProductEdits(
                nextCakes.reduce((acc, cake) => {
                    acc[cake._id] = {
                        name: cake.name || '',
                        description: cake.description || '',
                        category: cake.category || 'Classic',
                        price: String(Math.round(Number(cake.price ?? 0))),
                        availability: Boolean(cake.availability),
                        imageUrl: cake.imageUrl || '',
                        variants: normalizeVariants(cake.variants, cake.price)
                    };
                    return acc;
                }, {})
            );
            setProductErrors({});
        } catch {
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useAutoRefresh(fetchData, 45000);

    useEffect(() => () => {
        if (imagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
    }, [imagePreview]);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            await fetchData();
        } catch {
            setError('Failed to update order status');
        }
    };

    const handleProductEditChange = (cakeId, field, value) => {
        setProductEdits(prev => ({
            ...prev,
            [cakeId]: {
                ...(prev[cakeId] || {}),
                [field]: value
            }
        }));
        setProductErrors(prev => ({
            ...prev,
            [cakeId]: {
                ...(prev[cakeId] || {}),
                [field]: ''
            }
        }));
    };

    const handleProductUpdate = async (cake) => {
        const draft = productEdits[cake._id] || {};

        const nextErrors = validateProductDraft(draft, { requireImage: false });
        setProductErrors(prev => ({
            ...prev,
            [cake._id]: nextErrors
        }));
        if (Object.keys(nextErrors).length > 0) {
            setProductStatus('Please fix the highlighted product fields.');
            return;
        }

        const variants = buildVariantPayload(draft.variants || []);
        const parsedPrice = Number(draft.price);

        setUpdatingProductId(cake._id);
        setProductStatus('');
        try {
            const updatePayload = {
                name: draft.name.trim(),
                description: draft.description.trim(),
                category: draft.category.trim(),
                price: Math.max(0, Math.round(parsedPrice)),
                availability: Boolean(draft.availability),
                imageUrl: draft.imageUrl?.trim() || '',
                variants: variants
            };

            await updateCake(cake._id, updatePayload);
            setProductStatus(`✓ Updated ${cake.name} successfully.`);

            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchData();
        } catch (err) {
            console.error('Product update error:', err);
            setProductStatus(err.response?.data?.error || err.message || 'Failed to update product');
        } finally {
            setUpdatingProductId(null);
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            setImageFile(null);
            setImagePreview('');
            return;
        }

        setImageFile(file);
        if (imagePreview?.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(URL.createObjectURL(file));
        setForm(prev => ({ ...prev, imageUrl: '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormStatus('');
        const nextErrors = validateProductDraft({ ...form, imageFile, imageUrl: imageFile ? '' : form.imageUrl }, { requireImage: true });
        setFormErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setFormStatus('Please fix the highlighted product fields.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = new FormData();
            const variants = buildVariantPayload(form.variants);
            const basePrice = Number(variants[0]?.price ?? form.price);

            payload.append('name', form.name.trim());
            payload.append('description', form.description.trim());
            payload.append('category', form.category);
            payload.append('availability', String(Boolean(form.availability)));
            payload.append('price', String(Math.max(0, Math.round(basePrice || 0))));
            payload.append('variants', JSON.stringify(variants));

            if (imageFile) {
                payload.append('image', imageFile);
            } else if (form.imageUrl.trim()) {
                payload.append('imageUrl', form.imageUrl.trim());
            }

            await createCake(payload);
            setForm(makeDefaultProductForm());
            setImageFile(null);
            setImagePreview('');
            setFormErrors({});
            setFormStatus('Cake added successfully.');
            await fetchData();
        } catch (err) {
            setFormStatus(err.response?.data?.error || 'Failed to add cake');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <main className="page admin-page">
            <div className="container">
                <div className="admin-hero">
                    <div>
                        <div className="summary-pill summary-pill-accent" style={{ marginBottom: '1rem' }}>
                            Administration
                        </div>
                        <h1 className="page-title" style={{ marginBottom: '0.75rem' }}>Admin Console</h1>
                        <p className="admin-hero-copy">
                            Admins can edit product details and variants. Super Admins can also create and remove products.
                        </p>
                    </div>
                    <div className="admin-stats">
                        <div className="admin-stat">
                            <span>Total Orders</span>
                            <strong>{orderStats.totalOrders}</strong>
                        </div>
                        <div className="admin-stat">
                            <span>Active Orders</span>
                            <strong>{orderStats.activeOrders}</strong>
                        </div>
                        <div className="admin-stat">
                            <span>Revenue</span>
                            <strong>{formatCurrency(orderStats.totalRevenue)}</strong>
                        </div>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {productStatus && (
                    <div className={`alert ${productStatus.toLowerCase().includes('failed') || productStatus.toLowerCase().includes('valid') ? 'alert-error' : 'alert-success'}`}>
                        {productStatus}
                    </div>
                )}

                <div className="admin-grid">
                    {canCreateProducts(role) && (
                        <section className="card admin-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Add New Product</h3>
                                    <p>Create a product with one or more size and weight variants.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="admin-form">
                                <div className="form-group">
                                    <label className="form-label">Product Name</label>
                                    <input
                                        className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                                        value={form.name}
                                        onChange={e => {
                                            setForm(prev => ({ ...prev, name: e.target.value }));
                                            setFormErrors(prev => ({ ...prev, name: '' }));
                                        }}
                                        required
                                        placeholder="e.g. Belgian Truffle Tower"
                                        minLength="3"
                                        maxLength="120"
                                    />
                                    {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className={`form-input ${formErrors.description ? 'input-error' : ''}`}
                                        rows="4"
                                        value={form.description}
                                        onChange={e => {
                                            setForm(prev => ({ ...prev, description: e.target.value }));
                                            setFormErrors(prev => ({ ...prev, description: '' }));
                                        }}
                                        required
                                        placeholder="Short premium product story that sells the experience."
                                        minLength="10"
                                        maxLength="500"
                                    />
                                    {formErrors.description && <div className="form-error">{formErrors.description}</div>}
                                </div>

                                <div className="admin-form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select
                                            className={`form-select ${formErrors.category ? 'input-error' : ''}`}
                                            value={form.category}
                                            onChange={e => {
                                                setForm(prev => ({ ...prev, category: e.target.value }));
                                                setFormErrors(prev => ({ ...prev, category: '' }));
                                            }}
                                        >
                                            {CATEGORY_OPTIONS.map(option => <option key={option}>{option}</option>)}
                                        </select>
                                        {formErrors.category && <div className="form-error">{formErrors.category}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Availability</label>
                                        <select
                                            className="form-select"
                                            value={String(form.availability)}
                                            onChange={e => setForm(prev => ({ ...prev, availability: e.target.value === 'true' }))}
                                        >
                                            <option value="true">Available</option>
                                            <option value="false">Unavailable</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Image URL</label>
                                    <input
                                        className={`form-input ${formErrors.imageUrl ? 'input-error' : ''}`}
                                        type="url"
                                        value={form.imageUrl}
                                        onChange={e => {
                                            setForm(prev => ({ ...prev, imageUrl: e.target.value }));
                                            setFormErrors(prev => ({ ...prev, imageUrl: '' }));
                                        }}
                                        placeholder="https://..."
                                    />
                                    {formErrors.imageUrl && <div className="form-error">{formErrors.imageUrl}</div>}
                                </div>

                                <VariantEditor
                                    variants={form.variants}
                                    errors={formErrors.variants || []}
                                    onChange={(variants) => {
                                        setForm(prev => ({ ...prev, variants }));
                                        setFormErrors(prev => ({ ...prev, variants: '' }));
                                    }}
                                />

                                <div className="image-uploader">
                                    <div className="image-uploader-head">
                                        <div>
                                            <label className="form-label">Product Image</label>
                                            <p>Upload a photo or provide a hosted image URL.</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview('');
                                                setForm(prev => ({ ...prev, imageUrl: '' }));
                                            }}
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    <input
                                        className="form-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />

                                    <div className="image-preview">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" />
                                        ) : (
                                            <div className="image-preview-empty">No image selected yet</div>
                                        )}
                                    </div>
                                </div>

                                <button className="btn btn-primary" type="submit" disabled={submitting}>
                                    {submitting ? 'Publishing...' : 'Publish Product'}
                                </button>
                            </form>

                            {formStatus && (
                                <div className={`alert ${formStatus.toLowerCase().includes('failed') ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '1rem' }}>
                                    {formStatus}
                                </div>
                            )}
                        </section>
                    )}

                    {canEditProducts(role) && (
                        <section className="card admin-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Edit Products</h3>
                                    <p>Update product details, prices, availability, and variants.</p>
                                </div>
                            </div>

                            <div className="product-admin-stack">
                                {cakes.length === 0 && <p className="empty-inline">No products found.</p>}
                                {cakes.map((cake) => {
                                    const draft = productEdits[cake._id] || {};
                                    return (
                                        <article key={cake._id} className="product-admin-card">
                                            <div className="product-admin-top">
                                                <div>
                                                    <h4>{cake.name}</h4>
                                                    <p>{cake.category}</p>
                                                </div>
                                                <div className={`order-status ${cake.availability ? 'status-confirmed' : 'status-cancelled'}`}>
                                                    {cake.availability ? 'Available' : 'Unavailable'}
                                                </div>
                                            </div>

                                            <div className="admin-form">
                                                <div className="admin-form-row">
                                                    <div className="form-group">
                                                        <label className="form-label">Product Name</label>
                                                        <input
                                                            className={`form-input ${productErrors[cake._id]?.name ? 'input-error' : ''}`}
                                                            value={draft.name ?? ''}
                                                            onChange={e => handleProductEditChange(cake._id, 'name', e.target.value)}
                                                            minLength="3"
                                                            maxLength="120"
                                                        />
                                                        {productErrors[cake._id]?.name && <div className="form-error">{productErrors[cake._id].name}</div>}
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Category</label>
                                                        <select
                                                            className={`form-select ${productErrors[cake._id]?.category ? 'input-error' : ''}`}
                                                            value={draft.category ?? 'Classic'}
                                                            onChange={e => handleProductEditChange(cake._id, 'category', e.target.value)}
                                                        >
                                                            {CATEGORY_OPTIONS.map(option => <option key={option}>{option}</option>)}
                                                        </select>
                                                        {productErrors[cake._id]?.category && <div className="form-error">{productErrors[cake._id].category}</div>}
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Description</label>
                                                    <textarea
                                                        className={`form-input ${productErrors[cake._id]?.description ? 'input-error' : ''}`}
                                                        rows="3"
                                                        value={draft.description ?? ''}
                                                        onChange={e => handleProductEditChange(cake._id, 'description', e.target.value)}
                                                        minLength="10"
                                                        maxLength="500"
                                                    />
                                                    {productErrors[cake._id]?.description && <div className="form-error">{productErrors[cake._id].description}</div>}
                                                </div>

                                                <div className="admin-form-row">
                                                    <div className="form-group">
                                                        <label className="form-label">Price (Rs)</label>
                                                        <input
                                                            className={`form-input ${productErrors[cake._id]?.price ? 'input-error' : ''}`}
                                                            type="number"
                                                            inputMode="numeric"
                                                            min="0"
                                    step="1"
                                                            value={draft.price ?? ''}
                                                            onChange={(e) => handleProductEditChange(cake._id, 'price', e.target.value)}
                                                        />
                                                        {productErrors[cake._id]?.price && <div className="form-error">{productErrors[cake._id].price}</div>}
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Availability</label>
                                                        <select
                                                            className="form-select"
                                                            value={String(Boolean(draft.availability))}
                                                            onChange={(e) => handleProductEditChange(cake._id, 'availability', e.target.value === 'true')}
                                                        >
                                                            <option value="true">Available</option>
                                                            <option value="false">Unavailable</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Image URL</label>
                                                    <input
                                                        className={`form-input ${productErrors[cake._id]?.imageUrl ? 'input-error' : ''}`}
                                                        type="url"
                                                        value={draft.imageUrl ?? ''}
                                                        onChange={e => handleProductEditChange(cake._id, 'imageUrl', e.target.value)}
                                                    />
                                                    {productErrors[cake._id]?.imageUrl && <div className="form-error">{productErrors[cake._id].imageUrl}</div>}
                                                </div>

                                                <VariantEditor
                                                    variants={draft.variants || [createVariantRow({ price: cake.price })]}
                                                    errors={productErrors[cake._id]?.variants || []}
                                                    onChange={(variants) => handleProductEditChange(cake._id, 'variants', variants)}
                                                />
                                            </div>

                                            <div className="product-admin-footer">
                                                <strong>{formatCurrency(cake.price)}</strong>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleProductUpdate(cake)}
                                                    disabled={updatingProductId === cake._id}
                                                >
                                                    {updatingProductId === cake._id ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {(canManageOrders(role) || canEditProducts(role)) && (
                        <section className="card admin-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Order Control</h3>
                                    <p>Review each order and move it through the fulfillment pipeline.</p>
                                </div>
                            </div>

                            <div className="order-stack">
                                {orders.length === 0 && <p className="empty-inline">No orders found.</p>}
                                {orders.map(order => (
                                    <article key={order._id} className="admin-order-card">
                                        <div className="order-card-top">
                                            <div>
                                                <div className="order-reference">#{order._id.substring(0, 8)}</div>
                                                <div className="order-meta">{new Date(order.createdAt).toLocaleString()}</div>
                                            </div>
                                            <div className={`order-status ${order.status === 'confirmed' ? 'status-confirmed' : order.status === 'cancelled' ? 'status-cancelled' : 'status-pending'}`}>
                                                {order.status}
                                            </div>
                                        </div>

                                        <div className="order-line-items">
                                            {order.items.map(item => (
                                                <div key={`${order._id}-${item.cakeId}-${item.variantKey || 'legacy'}`} className="order-line">
                                                    <span>{item.name} × {item.quantity}{item.variantLabel ? ` (${item.variantLabel})` : ''}</span>
                                                    <strong>{formatCurrency(item.price * item.quantity)}</strong>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="order-footer">
                                            <div className="order-address">
                                                <span>Delivery Address</span>
                                                <p>{order.address || 'N/A'}</p>
                                            </div>
                                            <div className="order-amount">
                                                <span>Total</span>
                                                <strong>{formatCurrency(order.totalAmount)}</strong>
                                            </div>
                                        </div>

                                        {canManageOrders(role) && (
                                            <div className="order-action">
                                                <label className="form-label">Update Status (Auto-progresses every 2 minutes)</label>
                                                <select
                                                    className="form-select"
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                    disabled={order.status === 'delivered' || order.status === 'cancelled'}
                                                >
                                                    <option value="confirmed">Ordered</option>
                                                    <option value="packed">Packed</option>
                                                    <option value="ready_to_delivery">Ready for Delivery</option>
                                                    <option value="shipped">Out for Delivery</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
