const fs = require("fs/promises");
const path = require("path");

const storePath = path.join(__dirname, "..", "data", "store.json");

async function ensureStore() {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(
      storePath,
      JSON.stringify({ users: [], products: [] }, null, 2),
      "utf8"
    );
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(storePath, "utf8");
  return JSON.parse(raw);
}

async function writeStore(data) {
  await ensureStore();
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

async function getUsers() {
  const store = await readStore();
  return store.users || [];
}

async function saveUsers(users) {
  const store = await readStore();
  store.users = users;
  await writeStore(store);
}

async function getProducts() {
  const store = await readStore();
  return store.products || [];
}

async function saveProducts(products) {
  const store = await readStore();
  store.products = products;
  await writeStore(store);
}

module.exports = {
  getUsers,
  saveUsers,
  getProducts,
  saveProducts,
};
