import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, cancelOrder } from '../services/api.js';
import { formatCurrency } from '../utils/format.js';
import useAutoRefresh from '../hooks/useAutoRefresh.js';

const ORDER_STAGES = [
    { status: 'confirmed', label: 'Ordered', icon: '✓' },
    { status: 'packed', label: 'Packed', icon: '✓' },
    { status: 'ready_to_delivery', label: 'Ready for Delivery', icon: '✓' },
    { status: 'shipped', label: 'Out for Delivery', icon: '✓' },
    { status: 'delivered', label: 'Delivered', icon: '✓' }
];

const ORDER_STATUS_LABELS = {
    confirmed: 'Ordered',
    packed: 'Packed',
    ready_to_delivery: 'Ready for Delivery',
    shipped: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
};

function OrderTracker({ status }) {
    const currentIndex = ORDER_STAGES.findIndex(s => s.status === status);

    return (
        <div className="order-tracker">
            <div className="tracker-stages">
                {ORDER_STAGES.map((stage, index) => (
                    <div key={stage.status} className={`tracker-stage ${index <= currentIndex ? 'active' : ''} ${status === stage.status ? 'current' : ''}`}>
                        <div className="stage-dot">{index < currentIndex ? '✓' : index === currentIndex ? '●' : index + 1}</div>
                        <div className="stage-label">{stage.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function OrderHistoryPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState({});
    const [cancelError, setCancelError] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOrders();
            setOrders(res.data.data || []);
        } catch {
            setError('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useAutoRefresh(load, 15000);

    const handleCancelOrder = async (orderId) => {
        setCancelling(prev => ({ ...prev, [orderId]: true }));
        setCancelError(prev => ({ ...prev, [orderId]: '' }));
        try {
            await cancelOrder(orderId);
            await load();
        } catch (err) {
            setCancelError(prev => ({ ...prev, [orderId]: err.response?.data?.error || 'Failed to cancel order' }));
        } finally {
            setCancelling(prev => ({ ...prev, [orderId]: false }));
        }
    };

    const getStatusClass = (status) => {
        if (status === 'delivered') return 'status-confirmed';
        if (status === 'cancelled') return 'status-cancelled';
        return 'status-pending';
    };

    const canCancel = (status) => !['delivered', 'cancelled'].includes(status);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <main className="page">
            <div className="container">
                <h1 className="page-title">📋 Order Tracking</h1>
                {error && <div className="alert alert-error">{error}</div>}
                {orders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No orders yet</h3>
                        <p style={{ marginBottom: '1.5rem' }}>Start shopping to see your orders here!</p>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Cakes</button>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order._id} className="card order-card">
                            <div className="order-card-header">
                                <div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Order #{order._id.substring(0, 8)}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <span className={`order-status ${getStatusClass(order.status)}`}>
                                    {ORDER_STATUS_LABELS[order.status] || order.status.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>

                            {order.status !== 'cancelled' && (
                                <OrderTracker status={order.status} />
                            )}

                            {order.status === 'cancelled' && (
                                <div style={{ padding: '1rem', backgroundColor: 'var(--color-error-bg, rgba(239, 68, 68, 0.1))', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                    <p style={{ margin: 0, color: 'var(--color-error, #ef4444)', fontWeight: 500 }}>
                                        This order has been cancelled
                                    </p>
                                </div>
                            )}

                            <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Order Items</h4>
                                {order.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <span>
                                            {item.name}
                                            {item.variantLabel && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}> ({item.variantLabel})</span>}
                                            {' × '}
                                            {item.quantity}
                                        </span>
                                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Delivery Address</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>{order.address || 'N/A'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total Amount</div>
                                    <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-secondary)', fontSize: '1.1rem' }}>
                                        {formatCurrency(order.totalAmount)}
                                    </p>
                                </div>
                            </div>

                            {canCancel(order.status) && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                    {cancelError[order._id] && (
                                        <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
                                            {cancelError[order._id]}
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleCancelOrder(order._id)}
                                        disabled={cancelling[order._id]}
                                        style={{ width: '100%' }}
                                    >
                                        {cancelling[order._id] ? 'Cancelling...' : 'Cancel Order'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
