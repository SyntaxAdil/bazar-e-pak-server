import validateToken from "../lib/valid-token.js";
import { incrementMetric } from "../utils/system-metrics.js";
import User from "../modules/users/user.model.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    incrementMetric("authenticationFailures");
    const error = new Error("Unauthorized - No token provided");
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await validateToken(token);

    const userId = payload.id || payload.sub;
    if (!userId) {
      incrementMetric("authenticationFailures");

      const error = new Error(
        "Unauthorized - Invalid user",
      );

      error.statusCode = 401;

      return next(error);
    }

    const currentUser = await User.findById(
      userId,
    )
      .lean()
      .catch(() => null);

    if (!currentUser) {
      incrementMetric("authenticationFailures");

      const error = new Error(
        "Unauthorized - User not found",
      );

      error.statusCode = 401;

      return next(error);
    }

    if (
      currentUser.isBlocked ||
      currentUser.status !== "active"
    ) {
      const error = new Error(
        "Account is not active",
      );

      error.statusCode = 403;

      return next(error);
    }

    req.user = {
      ...payload,
      id: String(currentUser._id),
      role: currentUser.role,
      permissions:
        currentUser.permissions || [],
      name: currentUser.name,
      email: currentUser.email,
    };

    next();
  } catch (error) {
    incrementMetric("authenticationFailures");
    const authError = new Error("Unauthorized - Invalid token");
    authError.statusCode = 401;

    next(authError);
  }
};

export default authMiddleware;
