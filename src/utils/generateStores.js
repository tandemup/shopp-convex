import fs from "fs";
import crypto from "crypto";

const stores = JSON.parse(fs.readFileSync("stores.raw.json", "utf8"));

function generateId(store) {
  const input = `${store.name}|${store.address}`.toLowerCase();
  return crypto.createHash("sha256").update(input).digest("hex");
}

const storesWithId = stores.map((store) => ({
  ...store,
  id: generateId(store),
}));

fs.writeFileSync("stores.json", JSON.stringify(storesWithId, null, 2), "utf8");

console.log("✅ stores.json generado con ids SHA-256");
