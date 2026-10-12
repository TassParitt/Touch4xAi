import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/get-upload-url" && request.method === "POST") {
      try {
        const { filename, contentType } = await request.json();

        // Instantiate S3 client pointed to Cloudflare R2 endpoint
        const accountId = env.R2_ACCOUNT_ID || "2752109d4d388476f42f329b6f68c629";
        const bucketName = env.R2_BUCKET_NAME || "touch4xai";

        const s3 = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        });

        // Set path inside touch4xai bucket
        const cleanFilename = (filename || "measurement.json").replace(/[^a-zA-Z0-9._-]/g, "_");
        const objectKey = `raw_datasets/${Date.now()}_${cleanFilename}`;

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          ContentType: contentType || "application/json",
        });

        // Expire ticket in 5 minutes (300 seconds)
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return new Response(
          JSON.stringify({
            uploadUrl,
            objectKey,
            publicUrl: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
