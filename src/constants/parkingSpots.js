export const CABUENES_TEST_GROUP = "cabuenes-test";

export const CABUENES_TEST_PARKING_SPOTS = [
  [43.525374, -5.607285, 5], [43.525733, -5.606851, 6],
  [43.525958, -5.606294, 4], [43.525823, -5.605612, 7],
  [43.525464, -5.605117, 5], [43.52497, -5.604745, 8],
  [43.524476, -5.605055, 6], [43.524116, -5.605612, 5],
  [43.523892, -5.606232, 7], [43.524072, -5.606913, 4],
  [43.524521, -5.607471, 6], [43.525015, -5.607719, 5],
].map(([lat, lng, accuracy], index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `${CABUENES_TEST_GROUP}-${number}`,
    alias: `Cabueñes prueba ${number}`,
    lat,
    lng,
    accuracy,
    location: { lat, lng, accuracy, source: "test" },
  };
});

export const PARKING_DESTINATIONS = [
  { id: "palacio-deportes", label: "Palacio de los Deportes", category: "Deporte", address: "Paseo del Doctor Fleming, 929, 33203 Gijón, Asturias", latitude: 43.53502, longitude: -5.63586 },
  { id: "el-corte-ingles", label: "El Corte Inglés", category: "Centro comercial", address: "C/ Ramón Areces, 2, 33211 Gijón, Asturias", latitude: 43.5361, longitude: -5.6844 },
  { id: "los-fresnos", label: "C.C. Los Fresnos", category: "Centro comercial", address: "C. Río de Oro, 3, Centro, 33209 Gijón, Asturias", latitude: 43.5321, longitude: -5.6619 },
  { id: "el-molinon", label: "El Molinón", category: "Estadio", address: "C/ Luis Adaro Falcó, 33203 Gijón, Asturias", latitude: 43.536329, longitude: -5.637417 },
  { id: "hospital-cabuenes", label: "Hospital de Cabueñes", category: "Hospital", address: "Calle Los Prados, 395, 33203 Gijón, Asturias", latitude: 43.525186, longitude: -5.606614 },
  { id: "iglesia-san-julian", label: "Iglesia de San Julian", category: "Iglesia", address: "Iglesia de San Julián de Somió, Av. Dionisio Cifuentes, 19, Periurbano - Rural, 33203 Gijón, Asturias", latitude: 43.535538, longitude: -5.62342 },
];
