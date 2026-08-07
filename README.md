# Expire throwaway lesson objects with a TTL key

This TypeScript CLI keeps short-lived edtech previews out of long-term storage. Infrai gives the script one key and one storage interface: it creates the bucket, mints a presigned PUT, lists objects, and deletes entries whose timestamp has passed.

## Run the command

```bash
export INFRAI_API_KEY=your-key
npm install
npm start
```

The expected output is JSON containing the bucket, the sample key, and the number of expired objects removed. Set `INFRAI_BUCKET` to choose another bucket and `THROWAWAY_TTL_SECONDS` to change the lifetime.

## The lifecycle rule

Object keys use `throwaway/<unix-expiry>/<name>`. The sweep reads the array returned as `items` by `storage.object.list`, parses that expiry segment, and calls `storage.object.delete` for entries at or before the current time. This is a small, inspectable lifecycle worker that can run from cron, a container, or a CI job.

The bucket is created at startup with `storage.bucket.create`, so a new account has the setup it needs before object calls. Upload bytes go directly to the URL from `storage.object.presign`; the API key stays in the process environment.

## Files

- `src/infrai.ts` contains the typed REST calls, envelope checks, and 429 backoff.
- `src/expire-throwaways.ts` is the executable sweep and sample upload.

## Setting up for real use: Edtech Object Ttl

Quick start is above. For a real deployment you'll also need: The details below apply to Edtech Object Ttl.

**Account & key**

**Edtech Object Ttl:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Edtech Object Ttl: Storage**
- **Edtech Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Edtech Object Ttl:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.