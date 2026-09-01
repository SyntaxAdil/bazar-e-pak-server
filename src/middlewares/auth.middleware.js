import validateToken from "../lib/valid-token.js";


const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        const error = new Error("Unauthorized - No token provided");
        error.statusCode = 401;
        return next(error);
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = await validateToken(token);

        req.user = payload;

        next();
    } catch (error) {
        const authError = new Error("Unauthorized - Invalid token");
        authError.statusCode = 401;

        next(authError);
    }
};

export default authMiddleware;