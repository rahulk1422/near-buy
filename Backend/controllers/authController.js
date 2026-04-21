const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { getUsers, saveUsers } = require("../lib/fileStore");
const OWNER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@nearbuy.com").trim().toLowerCase();

function normalizeRole(role) {
  return role === "seller" ? "seller" : "user";
}

function getSafeRole(user, email) {
  if (user?.role === "admin" && email !== OWNER_ADMIN_EMAIL) {
    return "user";
  }

  return user?.role || "user";
}

function isProtectedOwner(user) {
  return user?.email?.trim?.().toLowerCase?.() === OWNER_ADMIN_EMAIL;
}

// 🔹 SIGNUP
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    if (!normalizedEmail) {
      return res.status(400).json({ msg: "Email is required" });
    }

    if (normalizedEmail === OWNER_ADMIN_EMAIL) {
      return res.status(403).json({ msg: "This admin email is reserved" });
    }

    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      const exist = users.find((user) => user.email === normalizedEmail);
      if (exist) return res.status(400).json({ msg: "User already exists" });

      const hashed = await bcrypt.hash(password, 10);
      users.push({
        _id: crypto.randomUUID(),
        name,
        email: normalizedEmail,
        password: hashed,
        role: normalizedRole,
        isBlocked: false,
      });

      await saveUsers(users);
      return res.json({ msg: "Signup successful (local storage mode)" });
    }

    const exist = await User.findOne({ email: normalizedEmail });
    if (exist) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: normalizedEmail,
      password: hashed,
      role: normalizedRole,
      isBlocked: false,
    });

    await user.save();

    res.json({ msg: "Signup successful" });
  } catch (error) {
    res.status(500).json({ msg: "Signup failed", error: error.message });
  }
};

// 🔹 LOGIN
exports.login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    const normalizedEmail = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      const user = users.find((item) => item.email === normalizedEmail);
      if (!user) return res.status(400).json({ msg: "User not found" });
      if (user.isBlocked) return res.status(403).json({ msg: "This account is blocked" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ msg: "Wrong password" });

      const safeRole = getSafeRole(user, normalizedEmail);

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: safeRole,
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ msg: "User not found" });
    if (user.isBlocked) return res.status(403).json({ msg: "This account is blocked" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const safeRole = getSafeRole(user, normalizedEmail);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: safeRole,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: "Login failed", error: error.message });
  }
};

// 🔹 RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ msg: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: "New password must be at least 6 characters long" });
    }

    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      const userIndex = users.findIndex((user) => user.email === email);
      if (userIndex === -1) return res.status(404).json({ msg: "User not found" });

      users[userIndex].password = await bcrypt.hash(newPassword, 10);
      await saveUsers(users);
      return res.json({ msg: "Password updated successfully" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Reset password failed", error: error.message });
  }
};

// 🔹 GET USERS
exports.getUsers = async (req, res) => {
  try {
    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      return res.json(
        users.map((user) => {
          const safeUser = { ...user };
          delete safeUser.password;
          return safeUser;
        })
      );
    }

    const users = await User.find({}, "-password").sort({ _id: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: "Users fetch failed", error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({ msg: "isBlocked must be true or false" });
    }

    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      const userIndex = users.findIndex((user) => user._id === id);
      if (userIndex === -1) return res.status(404).json({ msg: "User not found" });
      if (isProtectedOwner(users[userIndex])) {
        return res.status(403).json({ msg: "The owner admin account cannot be modified" });
      }

      users[userIndex] = {
        ...users[userIndex],
        isBlocked,
      };
      await saveUsers(users);

      const safeUser = { ...users[userIndex] };
      delete safeUser.password;
      return res.json(safeUser);
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (isProtectedOwner(user)) {
      return res.status(403).json({ msg: "The owner admin account cannot be modified" });
    }

    user.isBlocked = isBlocked;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    return res.json(safeUser);
  } catch (error) {
    res.status(500).json({ msg: "User status update failed", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.app.locals.useFileDb) {
      const users = await getUsers();
      const targetUser = users.find((user) => user._id === id);
      if (!targetUser) return res.status(404).json({ msg: "User not found" });
      if (isProtectedOwner(targetUser)) {
        return res.status(403).json({ msg: "The owner admin account cannot be deleted" });
      }

      const nextUsers = users.filter((user) => user._id !== id);
      await saveUsers(nextUsers);
      return res.json({ msg: "User deleted successfully" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (isProtectedOwner(user)) {
      return res.status(403).json({ msg: "The owner admin account cannot be deleted" });
    }

    await User.findByIdAndDelete(id);
    return res.json({ msg: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "User delete failed", error: error.message });
  }
};
