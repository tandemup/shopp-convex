function driveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
  const match = text.match(/(?:\/file\/d\/|[?&]id=|\/d\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function proxyUrl(id) {
  if (typeof process === "undefined") return null;
  let configured = process.env?.EXPO_PUBLIC_DRIVE_AUDIO_PROXY_URL;

  // En una aplicación Web publicada en Netlify podemos usar la Function
  // local del mismo dominio sin obligar a copiar esta variable a .env.
  // Durante el desarrollo local mantenemos Drive directo, porque la
  // Function no está disponible cuando se ejecuta solo `expo start --web`.
  if (!configured && typeof window !== "undefined") {
    const hostname = window.location?.hostname || "";
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      configured = "/.netlify/functions/drive-audio";
    }
  }
  if (!configured) return null;
  return `${String(configured).replace(/\/$/, "")}?id=${encodeURIComponent(id)}`;
}

export function normalizeDriveAudioUrl(value) {
  const text = String(value || "").trim();
  const id = driveFileId(text);
  if (!id) return text;
  return (
    proxyUrl(id) ||
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
  );
}

export { driveFileId };
