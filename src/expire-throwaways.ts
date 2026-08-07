import { infrai } from "./infrai";

const bucket = process.env.INFRAI_BUCKET ?? "edtech-throwaways";
const ttlSeconds = Number(process.env.THROWAWAY_TTL_SECONDS ?? "3600");

async function putSample() {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const key = `throwaway/${expiresAt}/lesson-preview.txt`;
  const { url } = await infrai.storage.object.presign(bucket, key, {
    op: "put",
    expires_seconds: 600,
    content_type: "text/plain",
    idempotency_key: `sample-${key}`,
  });
  const upload = await fetch(url, { method: "PUT", headers: { "Content-Type": "text/plain" }, body: "temporary lesson preview" });
  if (!upload.ok) throw new Error(`Upload failed with HTTP ${upload.status}`);
  return key;
}

async function expireObjects(now = Math.floor(Date.now() / 1000)) {
  const result = await infrai.storage.object.list(bucket);
  let removed = 0;
  for (const item of result.items) {
    const match = item.key.match(/^throwaway\/(\d+)\//);
    if (match && Number(match[1]) <= now) {
      await infrai.storage.object.delete(bucket, item.key);
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  await infrai.storage.bucket.create({ name: bucket });
  const sample = await putSample();
  const removed = await expireObjects();
  console.log(JSON.stringify({ bucket, sample, removed }));
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
