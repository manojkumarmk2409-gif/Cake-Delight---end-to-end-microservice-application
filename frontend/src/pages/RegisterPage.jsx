import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startRegistration, verifyRegistration } from '../services/api.js';
import { setAuthSession } from '../utils/auth.js';
import {
    normalizeEmail,
    validateAddress,
    validateEmail,
    validateName,
    validateOtp,
    validatePassword,
    validatePhone,
    sanitizeNameInput,
    sanitizePhoneInput
} from '../utils/validation.js';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState('details');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const nextErrors = step === 'details'
            ? {
                name: validateName(name),
                email: validateEmail(email),
                password: validatePassword(password),
                address: validateAddress(address),
                phoneNumber: validatePhone(phoneNumber)
            }
            : {
                otp: validateOtp(otp)
            };
        setFieldErrors(nextErrors);

        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }

        if (step === 'details') {
            setLoading(true);
            try {
                const res = await startRegistration({
                    name: name.trim(),
                    email: normalizeEmail(email),
                    password,
                    address: address.trim(),
                    phone: phoneNumber.trim()
                });
                if (res.data?.otpRequired) {
                    setStep('verify');
                    setMessage(res.data.message || 'OTP sent to your email. Please verify it to finish registration.');
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Registration failed');
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            const res = await verifyRegistration({ email: normalizeEmail(email), otp: otp.trim() });
            setAuthSession(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setMessage('');
        const nextErrors = {
            name: validateName(name),
            email: validateEmail(email),
            password: validatePassword(password),
            address: validateAddress(address),
            phoneNumber: validatePhone(phoneNumber)
        };
        setFieldErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
            return;
        }
        setLoading(true);
        try {
            const res = await startRegistration({
                name: name.trim(),
                email: normalizeEmail(email),
                password,
                address: address.trim(),
                phone: phoneNumber.trim()
            });
            if (res.data?.otpRequired) {
                setStep('verify');
                setMessage('A new OTP has been sent to your email.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Could not resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="page">
            <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
                <h1 className="page-title" style={{ textAlign: 'center' }}>
                    {step === 'details' ? 'Register' : 'Verify Email'}
                </h1>
                {message && <div className="alert" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>{message}</div>}
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
                    {step === 'details' ? (
                        <>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Name</label>
                                <input
                                    className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
                                    type="text"
                                    autoComplete="name"
                                    minLength="2"
                                    maxLength="80"
                                    value={name}
                                    onChange={e => {
                                        setName(sanitizeNameInput(e.target.value));
                                        setFieldErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    required
                                />
                                {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
                            </div>
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
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Password</label>
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
                                <label className="form-label">Address</label>
                                <input
                                    className={`form-input ${fieldErrors.address ? 'input-error' : ''}`}
                                    type="text"
                                    autoComplete="street-address"
                                    minLength="10"
                                    maxLength="240"
                                    value={address}
                                    onChange={e => {
                                        setAddress(e.target.value);
                                        setFieldErrors(prev => ({ ...prev, address: '' }));
                                    }}
                                    required
                                />
                                {fieldErrors.address && <div className="form-error">{fieldErrors.address}</div>}
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Phone Number</label>
                                <input
                                    className={`form-input ${fieldErrors.phoneNumber ? 'input-error' : ''}`}
                                    type="tel"
                                    autoComplete="tel"
                                    inputMode="tel"
                                    maxLength="20"
                                    value={phoneNumber}
                                    onChange={e => {
                                        setPhoneNumber(sanitizePhoneInput(e.target.value));
                                        setFieldErrors(prev => ({ ...prev, phoneNumber: '' }));
                                    }}
                                    required
                                />
                                {fieldErrors.phoneNumber && <div className="form-error">{fieldErrors.phoneNumber}</div>}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={email} readOnly />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">OTP</label>
                                <input
                                    className={`form-input ${fieldErrors.otp ? 'input-error' : ''}`}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength="6"
                                    value={otp}
                                    onChange={e => {
                                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                        setFieldErrors(prev => ({ ...prev, otp: '' }));
                                    }}
                                    placeholder="Enter the 6-digit OTP"
                                    required
                                />
                                {fieldErrors.otp && <div className="form-error">{fieldErrors.otp}</div>}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                Check the inbox for <strong>{email}</strong> and enter the code to finish creating your account.
                            </p>
                        </>
                    )}
                    <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
                        {loading ? (step === 'details' ? 'Sending OTP...' : 'Verifying...') : (step === 'details' ? 'Send OTP' : 'Verify & Create Account')}
                    </button>
                    {step === 'verify' && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '0.75rem' }}
                            type="button"
                            onClick={handleResendOtp}
                            disabled={loading}
                        >
                            Resend OTP
                        </button>
                    )}
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Login</Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
