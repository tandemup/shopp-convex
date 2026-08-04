const DRIVE_URL = "https://drive.usercontent.google.com/download";

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Range,Content-Type",
      "Cross-Origin-Resource-Policy": "cross-origin",
      ...headers,
    },
    body,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return response(204, "");
  if (!["GET", "HEAD"].includes(event.httpMethod)) {
    return response(405, "Method Not Allowed", { Allow: "GET,HEAD,OPTIONS" });
  }

  const id = String(event.queryStringParameters?.id || "").trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
    return response(400, "Missing or invalid Google Drive file id.");
  }

  const headers = {};
  const requestedRange = event.headers?.range || event.headers?.Range;
  if (requestedRange) headers.Range = requestedRange;

  try {
    const upstream = await fetch(
      `${DRIVE_URL}?id=${encodeURIComponent(id)}&export=download&confirm=t`,
      { headers, redirect: "follow" },
    );
    if (!upstream.ok && upstream.status !== 206) {
      return response(
        upstream.status,
        `Google Drive returned HTTP ${upstream.status}.`,
      );
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentType.includes("text/html")) {
      return response(
        502,
        "Google Drive returned HTML instead of an audio file.",
      );
    }
    if (event.httpMethod === "HEAD") {
      return response(upstream.status, "", {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        ...(contentRange ? { "Content-Range": contentRange } : {}),
        "Accept-Ranges": "bytes",
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return {
      ...response(upstream.status, buffer.toString("base64"), {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Accept-Ranges": "bytes",
        "Content-Transfer-Encoding": "binary",
        ...(contentRange ? { "Content-Range": contentRange } : {}),
        "Content-Length": String(buffer.length),
      }),
      isBase64Encoded: true,
    };
  } catch (error) {
    return response(
      502,
      `Audio proxy error: ${error?.message || "unknown error"}`,
    );
  }
};
