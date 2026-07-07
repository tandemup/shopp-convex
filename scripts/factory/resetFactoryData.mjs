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

async function readJsonFile(filename, fallbackValue) {
  const filepath = path.join(FACTORY_DIR, filename);

  try {
    const content = await fs.readFile(filepath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallbackValue;
    }

    throw error;
  }
}

const stores = await readJsonFile("stores.json", []);
const items = await readJsonFile("items.json", []);
const scanHistory = await readJsonFile("scanHistory.json", []);

const result = await client.mutation(api.factory.resetFactoryData, {
  stores,
  items,
  scanHistory,

  resetStores: true,
  resetItems: true,
  resetScanHistory: true,
});

console.log(JSON.stringify(result, null, 2));

//CONVEX_URL="https://tu-deployment.convex.cloud" node scripts/factory/resetFactoryData.mjs
