import crypto from "crypto";

function generateStoreId(store) {
  const input = `${store.name}|${store.address}`.toLowerCase();

  const fullHash = crypto.createHash("sha256").update(input).digest("hex");

  return fullHash.slice(0, 12); // 👈 aquí decides longitud
}
