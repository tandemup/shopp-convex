export function joinText(...parts) {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .map(String)
    .join("");
}
