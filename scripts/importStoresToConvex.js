const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api.js");

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.error("Falta EXPO_PUBLIC_CONVEX_URL.");
  console.error("Ejemplo:");
  console.error(
    "EXPO_PUBLIC_CONVEX_URL=https://xxxx.convex.cloud node scripts/importStoresToConvex.js",
  );
  process.exit(1);
}

const storesPath = path.join(__dirname, "..", "stores.json");

if (!fs.existsSync(storesPath)) {
  console.error(`No existe el archivo: ${storesPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(storesPath, "utf8");
const stores = JSON.parse(raw);

if (!Array.isArray(stores)) {
  console.error("stores.json debe contener un array.");
  process.exit(1);
}

function validateStore(store, index) {
  const prefix = `Store ${index}`;

  if (!store.id) throw new Error(`${prefix}: falta id`);
  if (!store.name) throw new Error(`${prefix}: falta name`);
  if (!store.city) throw new Error(`${prefix}: falta city`);
  if (!store.provincia) throw new Error(`${prefix}: falta provincia`);
  if (!store.address) throw new Error(`${prefix}: falta address`);
  if (typeof store.zipcode !== "number")
    throw new Error(`${prefix}: zipcode debe ser number`);
  if (!store.location) throw new Error(`${prefix}: falta location`);
  if (typeof store.location.lat !== "number")
    throw new Error(`${prefix}: location.lat debe ser number`);
  if (typeof store.location.lng !== "number")
    throw new Error(`${prefix}: location.lng debe ser number`);
  if (!store.location.source)
    throw new Error(`${prefix}: falta location.source`);
  if (typeof store.favorite !== "boolean")
    throw new Error(`${prefix}: favorite debe ser boolean`);
}

stores.forEach(validateStore);

async function main() {
  const client = new ConvexHttpClient(convexUrl);

  const result = await client.mutation(api.stores.upsertStores, {
    stores,
  });

  console.log("Importación completada:");
  console.log(result);
}

main().catch((error) => {
  console.error("Error importando stores.json a Convex:");
  console.error(error);
  process.exit(1);
});
