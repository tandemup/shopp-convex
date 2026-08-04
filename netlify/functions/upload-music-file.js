const Busboy = require("busboy");
const { google } = require("googleapis");
const { Readable } = require("stream");

function driveUrl(id) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    const busboy = Busboy({ headers: { "content-type": contentType } });
    let file = null;
    busboy.on("file", (_name, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        file = { filename: info.filename, mimeType: info.mimeType, buffer: Buffer.concat(chunks) };
      });
    });
    busboy.on("finish", () => resolve(file));
    busboy.on("error", reject);
    busboy.end(Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8"));
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const file = await parseMultipart(event);
    if (!file?.buffer?.length) throw new Error("No se recibió ningún archivo.");
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/drive"] });
    const drive = google.drive({ version: "v3", auth });
    const created = await drive.files.create({
      requestBody: { name: file.filename, parents: process.env.GOOGLE_DRIVE_MUSIC_FOLDER_ID ? [process.env.GOOGLE_DRIVE_MUSIC_FOLDER_ID] : undefined },
      media: { mimeType: file.mimeType || "application/octet-stream", body: Readable.from(file.buffer) },
      fields: "id",
    });
    await drive.permissions.create({ fileId: created.data.id, requestBody: { role: "reader", type: "anyone" } });
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: created.data.id, url: driveUrl(created.data.id), filename: file.filename }) };
  } catch (error) {
    console.error("[upload-music-file]", error);
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: error.message || "Error interno" }) };
  }
};
