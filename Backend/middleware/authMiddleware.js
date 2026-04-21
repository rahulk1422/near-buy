const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getUsers } = require("../lib/fileStore");

function sendUnauthorized(res, message = "Not authorized") {
  return res.status(401).json({ msg: message });
}

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return sendUnauthorized(res, "Authentication token is required");
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;

    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      user = users.find((item) => item._id === decoded.id);
      if (user) {
        const safeUser = { ...user };
        delete safeUser.password;
        user = safeUser;
      }
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      return sendUnauthorized(res, "User account no longer exists");
    }

    if (user.isBlocked) {
      return res.status(403).json({ msg: "This account is blocked" });
    }

    req.user = user;
    return next();
  } catch {
    return sendUnauthorized(res, "Invalid or expired token");
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ msg: "You do not have permission for this action" });
    }

    return next();
  };
}

module.exports = {
  protect,
  authorize,
};
