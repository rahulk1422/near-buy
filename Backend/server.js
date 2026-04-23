const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

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

app.locals.useFileDb = false;

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

async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not configured.");
    console.error("Add it in Railway Variables before deploying this service.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB Connected ✅");
    await ensureAdminUser();
    await ensureSellerUser();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed. Server not started.");
    console.error("Check the Railway MONGO_URI value and Atlas network access settings.");
    console.error(err.message);
    process.exit(1);
  }
}

startServer();

