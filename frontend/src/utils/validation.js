const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-() ]{7,20}$/;
const DISCOUNT_RE = /^[A-Z0-9]{3,20}$/;
const URL_RE = /^https?:\/\/.+/i;
const NAME_RE = /^[\p{L}\p{M} .'\-]+$/u;

export const trimText = (value) => (typeof value === 'string' ? value.trim() : '');

export const validateEmail = (value) => {
    const email = trimText(value).toLowerCase();
    if (!email) return 'Email is required';
    if (!EMAIL_RE.test(email)) return 'Enter a valid email address';
    return '';
};

export const validatePassword = (value) => {
    const password = typeof value === 'string' ? value : '';
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'Password must contain at least one letter and one number';
    }
    return '';
};

export const validateName = (value, label = 'Name') => {
    const name = trimText(value);
    if (!name) return `${label} is required`;
    if (name.length < 2) return `${label} must be at least 2 characters`;
    if (name.length > 80) return `${label} must be 80 characters or less`;
    if (!NAME_RE.test(name)) return `${label} can only contain letters and common punctuation`;
    return '';
};

export const validateAddress = (value) => {
    const address = trimText(value);
    if (!address) return 'Delivery address is required';
    if (address.length < 10) return 'Enter a fuller delivery address';
    if (address.length > 240) return 'Address must be 240 characters or less';
    return '';
};

export const validatePhone = (value) => {
    const phone = trimText(value);
    if (!phone) return 'Phone number is required';
    if (!PHONE_RE.test(phone)) return 'Enter a valid phone number';
    return '';
};

export const validateOtp = (value) => {
    const otp = trimText(value);
    if (!/^\d{6}$/.test(otp)) return 'Enter the 6-digit OTP';
    return '';
};

export const validateDiscountCode = (value) => {
    const code = trimText(value).toUpperCase();
    if (!code) return '';
    if (!DISCOUNT_RE.test(code)) return 'Discount code may only contain letters and numbers';
    return '';
};

export const validatePrice = (value, label = 'Price') => {
    if (value === '' || value === null || value === undefined) return `${label} is required`;
    const number = Number(value);
    if (!Number.isFinite(number)) return `${label} must be a number`;
    if (!Number.isInteger(number)) return `${label} must be a whole number`;
    if (number < 0) return `${label} must be 0 or higher`;
    return '';
};

export const validateQuantity = (value, label = 'Quantity') => {
    const number = Number(value);
    if (!Number.isInteger(number)) return `${label} must be a whole number`;
    if (number < 1) return `${label} must be at least 1`;
    if (number > 999) return `${label} must be 999 or less`;
    return '';
};

export const validateComment = (value) => {
    const comment = trimText(value);
    if (comment.length > 500) return 'Comment must be 500 characters or less';
    return '';
};

export const validateUrl = (value) => {
    const url = trimText(value);
    if (!url) return '';
    if (!URL_RE.test(url)) return 'Enter a valid URL';
    return '';
};

export const normalizeEmail = (value) => trimText(value).toLowerCase();
export const normalizeDiscountCode = (value) => trimText(value).toUpperCase();
export const sanitizeNameInput = (value) => (typeof value === 'string' ? value.replace(/[0-9]/g, '') : '');
export const sanitizePhoneInput = (value) => (typeof value === 'string' ? value.replace(/[A-Za-z]/g, '') : '');
