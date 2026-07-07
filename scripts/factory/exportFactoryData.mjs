import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../..");
const FACTORY_DIR = path.join(ROOT_DIR, "data/factory");

const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  throw new Error("Falta CONVEX_URL en variables de entorno.");
}

const client = new ConvexHttpClient(convexUrl);

function removeConvexSystemFields(row) {
  const { _id, _creationTime, ...cleanRow } = row;
  return cleanRow;
}

async function writeJsonFile(filename, data) {
  const filepath = path.join(FACTORY_DIR, filename);
  const content = JSON.stringify(data, null, 2);

  await fs.mkdir(FACTORY_DIR, {
    recursive: true,
  });

  await fs.writeFile(filepath, `${content}\n`, "utf8");
}

const exported = await client.query(api.factory.exportFactoryData, {});

await writeJsonFile(
  "stores.json",
  exported.stores.map(removeConvexSystemFields),
);

await writeJsonFile("items.json", exported.items.map(removeConvexSystemFields));

await writeJsonFile(
  "scanHistory.json",
  exported.scanHistory.map(removeConvexSystemFields),
);

await writeJsonFile("factoryExport.meta.json", {
  exportedAt: exported.exportedAt,
  exportedAtISO: new Date(exported.exportedAt).toISOString(),
  counts: {
    stores: exported.stores.length,
    items: exported.items.length,
    scanHistory: exported.scanHistory.length,
  },
});

console.log("Factory data exported:");
console.log({
  stores: exported.stores.length,
  items: exported.items.length,
  scanHistory: exported.scanHistory.length,
});

//CONVEX_URL="https://tu-deployment.convex.cloud" node scripts/factory/exportFactoryData.mjs
