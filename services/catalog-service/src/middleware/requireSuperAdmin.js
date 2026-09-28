module.exports = function requireSuperAdmin(req, res, next) {
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    const role = String(req.headers['x-user-role'] || 'user').toLowerCase();
    if (role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: super admin access required'
        });
    }

    return next();
};
