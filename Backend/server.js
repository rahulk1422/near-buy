const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const { getUsers, saveUsers } = require("./lib/fileStore");

const app = express();
const PORT = process.env.PORT || 5000;
const frontendDistPath = path.join(__dirname, "..", "dist");
const hasBuiltFrontend = fs.existsSync(frontendDistPath);
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@nearbuy.com";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || "Near Buy Admin";
const DEFAULT_SELLER_EMAIL = process.env.SELLER_EMAIL || "seller@nearbuy.com";
const DEFAULT_SELLER_PASSWORD = process.env.SELLER_PASSWORD || "Seller@123";
const DEFAULT_SELLER_NAME = process.env.SELLER_NAME || "Near Buy Seller";
const USE_FILE_DB = String(process.env.USE_FILE_DB || "").toLowerCase() === "true";

app.locals.useFileDb = true;
app.locals.mongoConnected = false;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("JWT_SECRET was not configured. Generated an ephemeral secret for this deployment.");
}

function isAllowedOrigin(origin) {
  return allowedOrigins.length === 0 || allowedOrigins.includes(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    storage: app.locals.useFileDb ? "file" : "mongo",
    mongoConnected: app.locals.mongoConnected,
  });
});

// ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));

if (hasBuiltFrontend) {
  app.use(express.static(frontendDistPath));

  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Near Buy API is running");
  });
}

async function ensureAdminUser() {
  const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
  if (existingAdmin) {
    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      await existingAdmin.save();
    }
  } else {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await User.create({
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    console.log(`Default admin ready: ${DEFAULT_ADMIN_EMAIL}`);
  }

  const demotedAdmins = await User.updateMany(
    { role: "admin", email: { $ne: DEFAULT_ADMIN_EMAIL } },
    { $set: { role: "user" } }
  );

  if (demotedAdmins.modifiedCount > 0) {
    console.log(`Extra admin accounts demoted: ${demotedAdmins.modifiedCount}`);
  }
}

async function ensureSellerUser() {
  const existingSeller = await User.findOne({ email: DEFAULT_SELLER_EMAIL });
  if (existingSeller) {
    if (existingSeller.role !== "seller") {
      existingSeller.role = "seller";
      existingSeller.name = existingSeller.name || DEFAULT_SELLER_NAME;
      await existingSeller.save();
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_SELLER_PASSWORD, 10);
  await User.create({
    name: DEFAULT_SELLER_NAME,
    email: DEFAULT_SELLER_EMAIL,
    password: hashedPassword,
    role: "seller",
  });

  console.log(`Default seller ready: ${DEFAULT_SELLER_EMAIL}`);
}

async function ensureFileDbAdminUser() {
  const users = await getUsers();
  const normalizedAdminEmail = DEFAULT_ADMIN_EMAIL.trim().toLowerCase();
  let hasChanges = false;

  let adminUser = users.find(
    (user) => user.email?.trim?.().toLowerCase?.() === normalizedAdminEmail
  );

  if (!adminUser) {
    users.push({
      _id: crypto.randomUUID(),
      name: DEFAULT_ADMIN_NAME,
      email: normalizedAdminEmail,
      password: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
      role: "admin",
      isBlocked: false,
    });
    hasChanges = true;
    console.log(`Default admin ready (file storage): ${DEFAULT_ADMIN_EMAIL}`);
  } else {
    if (adminUser.role !== "admin") {
      adminUser.role = "admin";
      hasChanges = true;
    }

    if (typeof adminUser.isBlocked !== "boolean") {
      adminUser.isBlocked = false;
      hasChanges = true;
    }
  }

  for (const user of users) {
    const normalizedUserEmail = user.email?.trim?.().toLowerCase?.();
    if (user.role === "admin" && normalizedUserEmail !== normalizedAdminEmail) {
      user.role = "user";
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await saveUsers(users);
  }
}

async function ensureFileDbSellerUser() {
  const users = await getUsers();
  const normalizedSellerEmail = DEFAULT_SELLER_EMAIL.trim().toLowerCase();
  let hasChanges = false;

  let sellerUser = users.find(
    (user) => user.email?.trim?.().toLowerCase?.() === normalizedSellerEmail
  );

  if (!sellerUser) {
    users.push({
      _id: crypto.randomUUID(),
      name: DEFAULT_SELLER_NAME,
      email: normalizedSellerEmail,
      password: await bcrypt.hash(DEFAULT_SELLER_PASSWORD, 10),
      role: "seller",
      isBlocked: false,
    });
    hasChanges = true;
    console.log(`Default seller ready (file storage): ${DEFAULT_SELLER_EMAIL}`);
  } else {
    if (sellerUser.role !== "seller") {
      sellerUser.role = "seller";
      hasChanges = true;
    }

    if (!sellerUser.name) {
      sellerUser.name = DEFAULT_SELLER_NAME;
      hasChanges = true;
    }

    if (typeof sellerUser.isBlocked !== "boolean") {
      sellerUser.isBlocked = false;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await saveUsers(users);
  }
}

async function ensureSeedUsers() {
  if (app.locals.useFileDb) {
    await ensureFileDbAdminUser();
    await ensureFileDbSellerUser();
    return;
  }

  await ensureAdminUser();
  await ensureSellerUser();
}

function startHttpServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running on port ${PORT} (${app.locals.useFileDb ? "file" : "mongo"} mode)`
    );
  });
}

async function enableFileDbMode(reason) {
  app.locals.useFileDb = true;
  app.locals.mongoConnected = false;

  if (reason) {
    console.warn(reason);
  }

  try {
    await ensureSeedUsers();
  } catch (error) {
    console.error(`File storage seed failed: ${error.message}`);
  }
}

async function connectMongoInBackground() {
  if (USE_FILE_DB) {
    await enableFileDbMode("USE_FILE_DB=true detected. Backend will stay in file storage mode.");
    return;
  }

  if (!process.env.MONGO_URI) {
    await enableFileDbMode(
      "MONGO_URI is not configured. Backend will stay in file storage fallback mode."
    );
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB Connected ✅");
    app.locals.useFileDb = false;
    app.locals.mongoConnected = true;
    await ensureSeedUsers();
    console.log("Backend switched to MongoDB mode.");
  } catch (err) {
    await enableFileDbMode(
      `MongoDB connection failed (${err.message}). Backend will continue in file storage fallback mode.`
    );
  }
}

async function startServer() {
  await enableFileDbMode("Starting backend with safe file storage mode.");
  startHttpServer();
  await connectMongoInBackground();
}

startServer().catch((error) => {
  console.error(`Fatal startup error: ${error.message}`);
  process.exit(1);
});

