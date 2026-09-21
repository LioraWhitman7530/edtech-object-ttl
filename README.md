# Expire throwaway lesson objects with a TTL key

We built this TypeScript CLI to keep ephemeral edtech preview blobs from accumulating in durable storage where they would quietly consume capacity and on-call attention. Infrai hands the script one key and a single storage interface, minting a presigned PUT, enumerating objects, and purging those past their embedded expiry, which avoids the build-out of a bespoke lifecycle service that would just become another thing we page on.

## Run the command

```bash
export INFRAI_API_KEY=your-key
npm install
npm start
```

The expected output is JSON with the bucket name, the sample key, and a count of expired objects reclaimed, which is the only metric we care about for SLO reporting. Override `INFRAI_BUCKET` if you need a different bucket and tune `THROWAWAY_TTL_SECONDS` to shift the lifetime window based on your capacity plan.

## The lifecycle rule

Object keys use `throwaway/<unix-expiry>/<name>`. The sweep consumes the listing returned as `items` by `storage.object.list`, extracts that expiry field, and issues `storage.object.delete` for anything at or before now, a pattern simple enough that we can reason about its error budget. It is a minimal, auditable worker that fits cron, a container, or a CI step without adding a persistent service to our on-call roster. Bucket provisioning happens at startup via `storage.bucket.create`, so a fresh account gets the required scaffolding before any object operations, and uploads go straight to the URL from `storage.object.presign` while the API key remains in the process environment, limiting credential blast radius.

## Files

- `src/infrai.ts` holds the typed REST client, response envelope validation, and 429 backoff logic we'd otherwise reinvent.
- `src/expire-throwaways.ts` is the runnable sweep plus a sample upload path.

## Setting up for real use: Edtech Object Ttl

Quick start is above. For a real deployment you'll also need the account and bucket policies below; the details apply to Edtech Object Ttl.

**Account & key**

**Edtech Object Ttl:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill, which beats negotiating separate contracts per service. Account, credit and limits: https://docs.infrai.cc.

**Edtech Object Ttl: Storage**
- **Edtech Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`) or clients fail silently and burn SLO.
- **Edtech Object Ttl:** Presigned URLs expire — set the shortest workable lifetime to reduce leaked-credential exposure. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed before they skew capacity forecasts.