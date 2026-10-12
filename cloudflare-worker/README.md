# Touch4xAi Cloudflare R2 Upload Worker

This Worker issues secure, presigned PUT URLs allowing the Touch4xAi PWA to stream micro-acoustic audio recordings and 6-axis IMU datasets directly into your `touch4xai` Cloudflare R2 bucket without exposing your API tokens.

## 1. Cloudflare R2 Bucket Details
- **Bucket Name**: `touch4xai`
- **Account ID**: `2752109d4d388476f42f329b6f68c629`
- **Dashboard**: https://dash.cloudflare.com/2752109d4d388476f42f329b6f68c629/r2/default/buckets/touch4xai

## 2. Set CORS Policy on `touch4xai` Bucket
In the Cloudflare Dashboard under `touch4xai` -> **Settings** -> **CORS Policy**, paste:

```json
[
  {
    "AllowedOrigins": [
      "https://touchxai.pages.dev",
      "http://localhost:3000",
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "GET"
    ],
    "AllowedHeaders": [
      "Content-Type"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

## 3. Deploy Cloudflare Worker
```bash
cd cloudflare-worker
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler deploy
```

Once deployed, copy your worker URL (e.g., `https://touch4xai-r2-worker.<your-subdomain>.workers.dev`) and enter it in the Touch4xAi app under **Cloudflare R2 Direct Upload** settings or in `.env` as `VITE_R2_WORKER_URL`.
