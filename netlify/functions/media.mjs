import { getStore } from "@netlify/blobs";

export async function handler(event) {
  const key = event.queryStringParameters?.key || "";
  if (!key || key.includes("..")) {
    return { statusCode: 400, body: "Geçersiz key" };
  }

  const store = getStore("media");
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result || !result.data) {
    return { statusCode: 404, body: "Görsel bulunamadı" };
  }

  const contentType = result.metadata?.contentType || "application/octet-stream";
  return {
    statusCode: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: Buffer.from(result.data).toString("base64"),
    isBase64Encoded: true,
  };
}
