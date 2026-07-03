export async function lookupBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 1 || !data.product) {
    return null;
  }

  return {
    barcode,
    name: data.product.product_name || "",
    brand: data.product.brands || "",
    image: data.product.image_front_url || "",
    category: data.product.categories || "",
    quantity: data.product.quantity || "",
  };
}
