import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api.js';
import { validatePassword } from '../utils/validation.js';

const validateResetToken = (value) => (/^[a-f0-9]{64}$/i.test((typeof value === 'string' ? value : '').trim()) ? '' : 'Reset link is missing or invalid');

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const nextErrors = {
            token: validateResetToken(token),
            password: validatePassword(password),
            confirmPassword: confirmPassword ? '' : 'Confirm your new password'
        };
        if (!nextErrors.password && password !== confirmPassword) {
            nextErrors.confirmPassword = 'Passwords do not match';
        }
        setFieldErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }

        setLoading(true);
        try {
            const res = await resetPassword({ token, password, confirmPassword });
            setMessage(res.data?.message || 'Password updated successfully');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="page">
            <div className="container" style={{ maxWidth: '420px', marginTop: '4rem' }}>
                <h1 className="page-title" style={{ textAlign: 'center' }}>Reset Password</h1>
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    Choose a new password for your account.
                </p>
                {message && <div className="alert" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>{message}</div>}
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">New Password</label>
                        <input
                            className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                            type="password"
                            autoComplete="new-password"
                            minLength="8"
                            value={password}
                            onChange={e => {
                                setPassword(e.target.value);
                                setFieldErrors(prev => ({ ...prev, password: '' }));
                            }}
                            required
                        />
                        {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}
                    </div>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Confirm New Password</label>
                        <input
                            className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                            type="password"
                            autoComplete="new-password"
                            minLength="8"
                            value={confirmPassword}
                            onChange={e => {
                                setConfirmPassword(e.target.value);
                                setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                            }}
                            required
                        />
                        {fieldErrors.confirmPassword && <div className="form-error">{fieldErrors.confirmPassword}</div>}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading || !token}>
                        {loading ? 'Updating password...' : 'Update Password'}
                    </button>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        <Link to="/login" style={{ color: 'var(--color-primary)' }}>Back to Login</Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
