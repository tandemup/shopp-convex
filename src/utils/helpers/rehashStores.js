import fs from "fs";

function generateStoreId({ name, city, zipcode }) {
  const input = `${name}|${city}|${zipcode}`.toLowerCase();

  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }

  return (hash >>> 0).toString(36).slice(0, 8);
}

const stores = JSON.parse(fs.readFileSync("stores.json", "utf8"));

const updated = stores.map((store) => ({
  ...store,
  id: generateStoreId(store),
}));

fs.writeFileSync("stores.json", JSON.stringify(updated, null, 2));
console.log("✅ stores.json actualizado con ids hash");
