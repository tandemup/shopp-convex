const DB_NAME = "shopp-music-offline";
const DB_VERSION = 2;
const TRACKS_STORE = "tracks";
const COVERS_STORE = "covers";

function supported() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  if (!supported()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(COVERS_STORE)) {
        db.createObjectStore(COVERS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("No se pudo abrir IndexedDB."));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function trackKey(track, index = 0) {
  return String(
    track._id ||
      track.trackId ||
      track.audioId ||
      track.audioUrl ||
      `track-${index}`,
  );
}

export function isMusicIndexedDbAvailable() {
  return supported();
}

export async function saveOfflineTrack(track, blob, index) {
  const db = await openDb();
  if (!db) throw new Error("IndexedDB no está disponible en este navegador.");
  const id = trackKey(track, index);
  const tx = db.transaction(TRACKS_STORE, "readwrite");
  tx.objectStore(TRACKS_STORE).put({
    id,
    blob,
    audioUrl: track.audioUrl,
    title: track.title,
    savedAt: Date.now(),
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve(id);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOfflineTrack(track, index) {
  const db = await openDb();
  if (!db) return null;
  const tx = db.transaction(TRACKS_STORE, "readonly");
  const record = await requestResult(
    tx.objectStore(TRACKS_STORE).get(trackKey(track, index)),
  );
  db.close();
  return record || null;
}

export async function saveOfflineCover(album, blob) {
  const db = await openDb();
  if (!db) throw new Error("IndexedDB no está disponible en este navegador.");
  const id = `cover:${String(album.sourceUrl || album._id || album.title)}`;
  const tx = db.transaction(COVERS_STORE, "readwrite");
  tx.objectStore(COVERS_STORE).put({ id, blob, savedAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve(id);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOfflineCover(album) {
  const db = await openDb();
  if (!db) return null;
  const id = `cover:${String(album?.sourceUrl || album?._id || album?.title)}`;
  const tx = db.transaction(COVERS_STORE, "readonly");
  const record = await requestResult(tx.objectStore(COVERS_STORE).get(id));
  db.close();
  return record || null;
}

export async function deleteOfflineAlbum(album) {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([TRACKS_STORE, COVERS_STORE], "readwrite");
  album.tracks.forEach((track, index) =>
    tx.objectStore(TRACKS_STORE).delete(trackKey(track, index)),
  );
  tx.objectStore(COVERS_STORE).delete(
    `cover:${String(album.sourceUrl || album._id || album.title)}`,
  );
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOfflineStorageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate)
    return null;
  return navigator.storage.estimate();
}
