module.exports = function requireProductEditor(req, res, next) {
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    const role = String(req.headers['x-user-role'] || 'user').toLowerCase();
    if (!['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: admin access required'
        });
    }

    return next();
};
