import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { BasketProvider, useBasket } from './context/BasketContext.jsx';
import { clearAuthSession, getCurrentUser, getStoredToken } from './utils/auth.js';
import { canManageOrders } from './utils/roles.js';
import CatalogPage from './pages/CatalogPage.jsx';
import CakeDetailPage from './pages/CakeDetailPage.jsx';
import BasketPage from './pages/BasketPage.jsx';
import CheckoutConfirmPage from './pages/CheckoutConfirmPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function Navbar() {
    const { totalItems } = useBasket();
    const navigate = useNavigate();
    const token = getStoredToken();
    const currentUser = getCurrentUser();
    const role = currentUser?.role || 'user';

    const handleLogout = () => {
        clearAuthSession();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <NavLink to="/" className="navbar-brand">🎂 Cake Delight</NavLink>
                <div className="navbar-links">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                        <span>🏠</span><span>Catalog</span>
                    </NavLink>
                    {token && (
                        <>
                            <NavLink to="/basket" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <span>🛒</span><span>Basket</span>
                                {totalItems > 0 && <span className="nav-badge">{totalItems}</span>}
                            </NavLink>
                            <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <span>📋</span><span>Orders</span>
                            </NavLink>
                            <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <span>🔔</span><span>Alerts</span>
                            </NavLink>
                        </>
                    )}
                    {canManageOrders(role) && (
                        <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <span>🛡️</span><span>Admin</span>
                        </NavLink>
                    )}
                    {token ? (
                        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
                    ) : (
                        <NavLink to="/login" className="btn btn-primary btn-sm">Login</NavLink>
                    )}
                </div>
            </div>
        </nav>
    );
}

function AdminRoute({ children }) {
    const token = getStoredToken();
    const currentUser = getCurrentUser();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (!canManageOrders(currentUser?.role)) {
        return (
            <main className="page">
                <div className="container">
                    <div className="empty-state" style={{ maxWidth: '720px', margin: '3rem auto' }}>
                        <div className="empty-state-icon">🛡️</div>
                        <h3>Admin access required</h3>
                        <p style={{ marginBottom: '1.5rem' }}>
                            This area is reserved for order operations and product management.
                        </p>
                        <button className="btn btn-primary" onClick={() => window.location.assign('/')}>
                            Back to Catalog
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return children;
}

function App() {
    return (
        <BasketProvider>
            <BrowserRouter>
                <Navbar />
                <Routes>
                    <Route path="/" element={<CatalogPage />} />
                    <Route path="/cakes/:id" element={<CakeDetailPage />} />
                    <Route path="/basket" element={<BasketPage />} />
                    <Route path="/checkout/confirm" element={<CheckoutConfirmPage />} />
                    <Route path="/orders" element={<OrderHistoryPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                </Routes>
            </BrowserRouter>
        </BasketProvider>
    );
}

export default App;
