import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/format.js';

export default function CheckoutConfirmPage() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const order = state?.order;

    if (!order) {
        return (
            <main className="page">
                <div className="container">
                    <div className="empty-state">
                        <h3>No order found</h3>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Catalog</button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="page">
            <div className="container">
                <div className="confirmation-card">
                    <div className="confirmation-icon">🎉</div>
                    <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem', color: 'var(--color-success)' }}>
                        Order Confirmed!
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                        Thank you! Your delicious cakes are being prepared. A confirmation notification has been sent.
                    </p>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Order ID</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{order._id}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                            <span className="order-status status-confirmed">{order.status}</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                            {order.items?.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.9rem' }}>
                                    <span>{item.name} × {item.quantity}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-secondary)', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                                <span>Total</span>
                                <span>{formatCurrency(order.totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>Continue Shopping</button>
                        <button className="btn btn-outline" onClick={() => navigate('/orders')}>View Orders</button>
                    </div>
                </div>
            </div>
        </main>
    );
}
