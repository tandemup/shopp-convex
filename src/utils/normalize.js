export function normalizeProductName(name = "") {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarNombre(nombre, separador = "-") {
  return nombre
    .trim()
    .toLowerCase()
    .replace(/\s+/g, separador)
    .replace(/[^a-z0-9_-]/g, "");
}
