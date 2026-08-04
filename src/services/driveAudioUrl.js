function driveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
  const match = text.match(/(?:\/file\/d\/|[?&]id=|\/d\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function proxyUrl(id) {
  if (typeof process === "undefined") return null;
  const configured = process.env?.EXPO_PUBLIC_DRIVE_AUDIO_PROXY_URL;
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
