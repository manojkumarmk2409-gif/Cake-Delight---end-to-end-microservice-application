const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';

const decodeBase64Url = (value) => {
    if (!value) return null;

    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    try {
        return atob(padded);
    } catch {
        return null;
    }
};

export const getStoredToken = () => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

export const clearAuthSession = () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
};

export const setAuthSession = (token, user) => {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(TOKEN_KEY, token);
    if (user?.id) {
        localStorage.setItem(USER_ID_KEY, user.id);
    }
};

export const getCurrentUser = () => {
    const token = getStoredToken();
    if (!token) return null;

    const [, payload] = token.split('.');
    const decodedPayload = decodeBase64Url(payload);
    if (!decodedPayload) return null;

    try {
        const data = JSON.parse(decodedPayload);
        return {
            userId: data.userId || null,
            role: String(data.role || 'user').toLowerCase()
        };
    } catch {
        return null;
    }
};

export const isAuthenticated = () => Boolean(getCurrentUser());
