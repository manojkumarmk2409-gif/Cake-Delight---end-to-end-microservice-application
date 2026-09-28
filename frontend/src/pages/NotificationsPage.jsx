import { useState, useEffect, useCallback } from 'react';
import { getNotifications } from '../services/api.js';
import useAutoRefresh from '../hooks/useAutoRefresh.js';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getNotifications();
            setNotifications(res.data.data || []);
        } catch {
            setError('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useAutoRefresh(load, 20000);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <main className="page">
            <div className="container">
                <h1 className="page-title">🔔 Notifications</h1>
                {error && <div className="alert alert-error">{error}</div>}
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔔</div>
                        <h3>No notifications yet</h3>
                        <p>Notifications appear here after you place an order.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n._id} className="card notification-card">
                            <div className="notification-dot" style={{ background: n.status === 'sent' ? 'var(--color-success)' : 'var(--color-warning)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{n.message}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                                    <span>📧 {n.channel}</span>
                                    <span>🔗 Order: {n.orderId}</span>
                                    <span>🕐 {new Date(n.sentAt).toLocaleString()}</span>
                                </div>
                            </div>
                            <span className={`order-status ${n.status === 'sent' ? 'status-confirmed' : 'status-pending'}`}>{n.status}</span>
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
