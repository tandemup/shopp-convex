const Busboy = require("busboy");
const { google } = require("googleapis");

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    const busboy = Busboy({ headers: { "content-type": contentType } });
    const fields = {};
    const files = [];
    busboy.on("field", (name, value) => { fields[name] = value; });
    busboy.on("file", (name, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => files.push({ name, filename: info.filename, mimeType: info.mimeType, buffer: Buffer.concat(chunks) }));
    });
    busboy.on("finish", () => resolve({ fields, files }));
    busboy.on("error", reject);
    busboy.end(Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8"));
  });
}

function driveUrl(id) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const { fields, files } = await parseMultipart(event);
    const album = JSON.parse(fields.album || "{}");
    const cover = files.find((file) => file.name === "cover");
    const tracks = files.filter((file) => file.name === "tracks");
    if (!album.title || !cover || !tracks.length) throw new Error("Faltan título, carátula o pistas.");

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/drive"] });
    const drive = google.drive({ version: "v3", auth });
    const parentId = process.env.GOOGLE_DRIVE_MUSIC_FOLDER_ID;
    const folder = await drive.files.create({ requestBody: { name: album.title, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined }, fields: "id" });
    const folderId = folder.data.id;
    const upload = async (file) => {
      const created = await drive.files.create({ requestBody: { name: file.filename, parents: [folderId] }, media: { mimeType: file.mimeType || "application/octet-stream", body: require("stream").Readable.from(file.buffer) }, fields: "id" });
      await drive.permissions.create({ fileId: created.data.id, requestBody: { role: "reader", type: "anyone" } });
      return { id: created.data.id, url: driveUrl(created.data.id) };
    };
    const coverResult = await upload(cover);
    const trackResults = [];
    for (const track of tracks) trackResults.push({ ...(await upload(track)), filename: track.filename });
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ coverId: coverResult.id, coverUrl: coverResult.url, tracks: trackResults }) };
  } catch (error) {
    console.error("[upload-album]", error);
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: error.message || "Error interno" }) };
  }
};
