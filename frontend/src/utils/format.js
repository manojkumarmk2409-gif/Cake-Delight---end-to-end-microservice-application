const rupeeFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

export const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        return '₹0';
    }

    return rupeeFormatter.format(Math.round(amount));
};
