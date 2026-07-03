/**
 * openingHours format esperado (ejemplo):
 *
 * {
 *   monday:    [{ open: "09:00", close: "21:00" }],
 *   tuesday:   [{ open: "09:00", close: "21:00" }],
 *   wednesday: [{ open: "09:00", close: "21:00" }],
 *   thursday:  [{ open: "09:00", close: "21:00" }],
 *   friday:    [{ open: "09:00", close: "22:00" }],
 *   saturday:  [{ open: "09:00", close: "22:00" }],
 *   sunday:    []
 * }
 */

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const timeToMinutes = (time) => {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const getNowMinutes = (date = new Date()) =>
  date.getHours() * 60 + date.getMinutes();

const getDayKey = (date = new Date()) => DAYS[date.getDay()];

export const isOpenNow = (openingHours, date = new Date()) => {
  if (!openingHours) return false;

  const dayKey = getDayKey(date);
  const ranges = openingHours[dayKey];

  if (!Array.isArray(ranges) || ranges.length === 0) return false;

  const nowMinutes = getNowMinutes(date);

  return ranges.some(({ open, close }) => {
    const openMin = timeToMinutes(open);
    const closeMin = timeToMinutes(close);

    if (openMin == null || closeMin == null) return false;

    return nowMinutes >= openMin && nowMinutes < closeMin;
  });
};

export const getOpenStatus = (openingHours, date = new Date()) => {
  return isOpenNow(openingHours, date) ? "open" : "closed";
};

export const getOpeningText = (openingHours, date = new Date()) => {
  if (!openingHours) return "Horario no disponible";

  const dayKey = getDayKey(date);
  const ranges = openingHours[dayKey];

  if (!Array.isArray(ranges) || ranges.length === 0) {
    return "Cerrado hoy";
  }

  const nowMinutes = getNowMinutes(date);

  for (const { open, close } of ranges) {
    const openMin = timeToMinutes(open);
    const closeMin = timeToMinutes(close);

    if (openMin == null || closeMin == null) continue;

    if (nowMinutes < openMin) {
      return `Abre a las ${open}`;
    }

    if (nowMinutes >= openMin && nowMinutes < closeMin) {
      return `Abierto · Cierra a las ${close}`;
    }
  }

  return "Cerrado";
};
