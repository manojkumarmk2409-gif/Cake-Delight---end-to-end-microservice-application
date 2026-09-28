import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api.js';
import { setAuthSession } from '../utils/auth.js';
import { validateEmail, validatePassword, normalizeEmail } from '../utils/validation.js';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const nextErrors = {
            email: validateEmail(email),
            password: validatePassword(password)
        };
        setFieldErrors(nextErrors);
        if (nextErrors.email || nextErrors.password) {
            return;
        }

        setLoading(true);
        try {
            const res = await login({ email: normalizeEmail(email), password });
            setAuthSession(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="page">
            <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
                <h1 className="page-title" style={{ textAlign: 'center' }}>Login</h1>
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
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                minLength="8"
                                value={password}
                                onChange={e => {
                                    setPassword(e.target.value);
                                    setFieldErrors(prev => ({ ...prev, password: '' }));
                                }}
                                style={{ paddingRight: '3rem' }}
                                required
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword(prev => !prev)}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: '0.7rem',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.25rem'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M10.6 10.6A2 2 0 0012 15a2 2 0 001.4-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M7.5 7.8C5.6 9.1 4 11.2 3 12c1.9 2.5 5.4 6 9 6 1.5 0 3-.4 4.3-1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M14.7 5.3C13.9 5.1 13 5 12 5 8.4 5 4.9 8.5 3 11c.5.7 1.1 1.4 1.8 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}
                    </div>
                    <div style={{ textAlign: 'right', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <Link to="/forgot-password" style={{ color: 'var(--color-primary)' }}>
                            Forgot password?
                        </Link>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)' }}>Register</Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
