import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api.js';
import { normalizeEmail, validateEmail } from '../utils/validation.js';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const nextErrors = { email: validateEmail(email) };
        setFieldErrors(nextErrors);
        if (nextErrors.email) {
            return;
        }

        setLoading(true);
        try {
            const res = await requestPasswordReset({ email: normalizeEmail(email) });
            setMessage(res.data?.message || 'If an account exists for that email, a reset link has been sent.');
        } catch (err) {
            setError(err.response?.data?.error || 'Could not start password reset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="page">
            <div className="container" style={{ maxWidth: '420px', marginTop: '4rem' }}>
                <h1 className="page-title" style={{ textAlign: 'center' }}>Forgot Password</h1>
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    Enter your email address and we will send you a password reset link.
                </p>
                {message && <div className="alert" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>{message}</div>}
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Email</label>
                        <input
                            className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={e => {
                                setEmail(e.target.value);
                                setFieldErrors(prev => ({ ...prev, email: '' }));
                            }}
                            required
                        />
                        {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
                        {loading ? 'Sending reset link...' : 'Send Reset Link'}
                    </button>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Remembered your password? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Login</Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
