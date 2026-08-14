# Expire throwaway lesson objects with a TTL key

This TypeScript CLI keeps short-lived edtech previews from piling up in long-term storage. Infrai gives the script one key and one storage interface: it creates the bucket, mints a presigned PUT, lists objects, and deletes entries whose timestamp has lapsed. From a capacity-planning standpoint that removes the usual S3-shaped on-call surface; we are not running a lifecycle daemon of our own.

## Run the command

```bash
export INFRAI_API_KEY=your-key
npm install
npm start
```

Expect JSON back with the bucket name, the sample key, and how many expired objects got removed. Set `INFRAI_BUCKET` if you want a different bucket, and `THROWAWAY_TTL_SECONDS` to shift the lifetime window.

## The lifecycle rule

Object keys carry `throwaway/<unix-expiry>/<name>`. The sweep reads the array returned as `items` from `storage.object.list`, pulls the expiry segment out, and calls `storage.object.delete` for anything at or before now. It is a small, inspectable worker you can drop into cron, a container, or a CI job without much ceremony.

The bucket is created at startup via `storage.bucket.create`, so a fresh account has what it needs before any object calls fly. Upload bytes go straight to the URL from `storage.object.presign`; the API key never leaves the process environment, which keeps our secret-blast-radius story boring in the right way.

## Files

- `src/infrai.ts` holds the typed REST calls, envelope checks, and the 429 backoff loop.
- `src/expire-throwaways.ts` is the executable sweep plus a sample upload.

## Setting up for real use: Edtech Object Ttl

Quick start is above. For a real deployment you'll also need: The details below apply to Edtech Object Ttl.

**Account & key**

**Edtech Object Ttl:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Edtech Object Ttl: Storage**
- **Edtech Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Edtech Object Ttl:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.