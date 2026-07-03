export const formatUnit = (u) => {
  if (!u) return "u";
  const map = { u: "u", kg: "kg", g: "g", l: "l" };
  return map[u] ?? u;
};
