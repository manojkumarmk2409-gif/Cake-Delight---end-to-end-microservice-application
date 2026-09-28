import axios from 'axios';
import { clearAuthSession } from '../utils/auth.js';

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

// Request interceptor for auth token and logging
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (typeof config.headers?.set === 'function') {
            config.headers.set('Content-Type', null);
        } else if (config.headers) {
            delete config.headers['Content-Type'];
            delete config.headers['content-type'];
        }
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    response => response,
    error => {
        const isAuthRequest = error.config?.url?.includes('/api/auth/');
        if (error.response?.status === 401 && !isAuthRequest) {
            clearAuthSession();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const startRegistration = (data) => api.post('/api/auth/register', data);
export const verifyRegistration = (data) => api.post('/api/auth/register/verify', data);
export const register = startRegistration;
export const login = (data) => api.post('/api/auth/login', data);
export const requestPasswordReset = (data) => api.post('/api/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/api/auth/reset-password', data);
export const getMe = () => api.get('/api/users/me');

// Catalog
export const getCakes = (params) => api.get('/api/catalog/cakes', { params });
export const getCatalogPriceRange = () => api.get('/api/catalog/cakes/price-range');
export const getCakeById = (id) => api.get(`/api/catalog/cakes/${id}`);
export const createCake = (data) => api.post('/api/catalog/cakes', data);
export const updateCake = (id, data) => api.put(`/api/catalog/cakes/${id}`, data);
export const deleteCake = (id) => api.delete(`/api/catalog/cakes/${id}`);
export const updateOrderStatus = (orderId, status) =>
    api.put(`/api/orders/${orderId}/status`, { status });

// Cart
export const getCart = () => api.get(`/api/cart/`);
export const addToCart = (item) => api.post(`/api/cart/items`, item);
export const updateCartItem = (cakeId, quantity, variantKey) =>
    api.put(`/api/cart/items/${cakeId}`, { quantity, variantKey });
export const removeFromCart = (cakeId, variantKey) =>
    api.delete(`/api/cart/items/${cakeId}`, { params: variantKey ? { variantKey } : undefined });

// Compatibility aliases used by the UI and tests
export const getBasket = getCart;
export const addToBasket = addToCart;
export const updateBasketItem = (cakeId, quantity, variantKey) =>
    updateCartItem(cakeId, quantity, variantKey);
export const removeFromBasket = (cakeId, variantKey) =>
    removeFromCart(cakeId, variantKey);

// Orders
export const checkout = (data) => api.post(`/api/orders/checkout`, data);
export const getOrders = () => api.get(`/api/orders/`);
export const getOrder = (id) => api.get(`/api/orders/${id}`);
export const cancelOrder = (id) => api.post(`/api/orders/${id}/cancel`);

// Ratings
export const getRatings = (cakeId) => api.get(`/api/ratings/${cakeId}`);
export const getRatingAverage = (cakeId) => api.get(`/api/ratings/${cakeId}/average`);
export const submitRating = (data) => api.post('/api/ratings/', data);

// Notifications
export const getNotifications = () => api.get(`/api/notifications/`);

export default api;
