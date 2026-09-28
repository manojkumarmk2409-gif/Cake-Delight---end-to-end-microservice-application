const ROLE_RANKS = {
    user: 0,
    admin: 1,
    super_admin: 2
};

export const normalizeRole = (role) => String(role || 'user').toLowerCase();

export const getRoleRank = (role) => ROLE_RANKS[normalizeRole(role)] ?? ROLE_RANKS.user;

export const hasRoleAtLeast = (role, minimumRole) => getRoleRank(role) >= getRoleRank(minimumRole);

export const canManageOrders = (role) => hasRoleAtLeast(role, 'admin');

export const canEditProducts = (role) => hasRoleAtLeast(role, 'admin');

export const canCreateProducts = (role) => hasRoleAtLeast(role, 'super_admin');
