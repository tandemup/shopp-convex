export default function getDaysSinceJanuary1() {
  const today = new Date();

  const startOfYear = new Date(
    today.getFullYear(),
    0, // enero
    1,
  );

  const diffMs = today - startOfYear;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getListName(fecha = new Date()) {
  const diasSemana = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  const asturias = [
    "ud-llanera",
    "cd-covadonga",
    "caudal",
    "sporting-atletico",
    "mosconia",
    "l-entregu",
    "union-ceares",
    "llanes",
    "siero",
    "san-martin",
    "colunga",
    "praviano",
    "aviles-stadium",
    "navarro",
    "ud-gijon-industrial",
    "real-titanico",
    "lenense",
    "tuilla",
  ];

  const diaSemana = diasSemana[fecha.getDay()];
  const diaMes = fecha.getDate();
  const dName = `${diaSemana} ${diaMes}`;
}
