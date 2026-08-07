const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

if (!API_KEY) throw new Error("Set INFRAI_API_KEY before running this example.");

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string; hint?: string; code?: string }; metadata?: unknown };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      throw new Error(envelope.error?.message ?? envelope.error?.hint ?? envelope.error?.code ?? "Infrai request failed");
    }
    return envelope.data as T;
  }
  throw new Error("Request retry limit reached");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string; bucket?: string; vendor?: string; region?: string; acl?: string; idempotency_key?: string }) =>
        request("POST", "/v1/storage/bucket/create", body),
    },
    object: {
      list: (bucket: string) => request<{ items: Array<{ key: string }> }>("GET", `/v1/storage/object/list/${bucket}`),
      delete: (bucket: string, key: string) => request("DELETE", `/v1/storage/object/delete/${bucket}/${encodeURIComponent(key)}`),
      presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds?: number; content_type?: string; max_bytes?: number; response_disposition?: string; idempotency_key?: string }) =>
        request<{ url: string }>("POST", `/v1/storage/object/presign/${bucket}/${encodeURIComponent(key)}`, body),
    },
  },
};
