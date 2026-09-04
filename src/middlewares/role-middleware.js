// src/middlewares/role-middleware.js
const checkRoleMiddleware = (roles) => (
    req,
    res,
    next,
) => {
    if (!req.user) {
        const error = new Error(
            "Unauthorized",
        );

        error.statusCode = 401;

        return next(error);
    }

    const allowedRoles = Array.isArray(roles)
        ? roles
        : [roles];

    if (
        !allowedRoles.includes(
            req.user.role,
        )
    ) {
        const error = new Error(
            "Forbidden - Insufficient permissions",
        );

        error.statusCode = 403;

        return next(error);
    }

    next();
};

export default checkRoleMiddleware;