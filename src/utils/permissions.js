export const ADMIN_PERMISSIONS = [
    "users.view", "shops.view", "products.view", "products.delete",
    "reviews.view", "reviews.moderate", "analytics.view",
];

export const hasPermission = (user, permission) =>
    user?.role === "super_admin" ||
    (user?.role === "admin" && Array.isArray(user.permissions) && user.permissions.includes(permission));

export const checkPermissionMiddleware = (permission) => (req, res, next) => {
    if (!req.user) { const e = new Error("Unauthorized"); e.statusCode = 401; return next(e); }
    if (!hasPermission(req.user, permission)) { const e = new Error("Forbidden - Permission required"); e.statusCode = 403; return next(e); }
    next();
};
