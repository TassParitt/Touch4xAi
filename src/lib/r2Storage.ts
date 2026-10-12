/**
 * Cloudflare R2 Direct Client Edge Upload Service for Touch4xAi
 * 
 * Target Bucket: touch4xai
 * Account ID: 2752109d4d388476f42f329b6f68c629
 * Bucket Dashboard: https://dash.cloudflare.com/2752109d4d388476f42f329b6f68c629/r2/default/buckets/touch4xai
 * 
 * Flow:
 * 1. PWA requests Presigned PUT URL ticket from Cloudflare Worker or backend proxy.
 * 2. Worker returns secure Presigned PUT URL with 5-minute expiration.
 * 3. Browser PWA directly streams raw audio and 6-axis IMU JSON datasets into touch4xai bucket.
 */

export interface R2UploadResult {
  success: boolean;
  objectKey: string;
  uploadUrl?: string;
  publicUrl: string;
  simulated?: boolean;
  message?: string;
  error?: string;
  timestamp: string;
  filename: string;
  byteSize: number;
}

export interface R2StatusInfo {
  configured: boolean;
  bucket: string;
  accountId: string;
  hasDirectKeys: boolean;
  workerUrlConfigured: boolean;
  dashboardUrl: string;
}

const LOCAL_STORAGE_WORKER_KEY = 'touch4xai_custom_worker_url';
const LOCAL_STORAGE_R2_HISTORY_KEY = 'touch4xai_r2_upload_history';

/**
 * Gets the configured Cloudflare Worker URL from localStorage or environment
 */
export function getSavedWorkerUrl(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_WORKER_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Saves a custom Cloudflare Worker URL to localStorage
 */
export function saveWorkerUrl(url: string): void {
  try {
    if (url.trim()) {
      localStorage.setItem(LOCAL_STORAGE_WORKER_KEY, url.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_WORKER_KEY);
    }
  } catch (err) {
    console.error('Failed to save worker URL:', err);
  }
}

/**
 * Retrieves the history of uploaded datasets to Cloudflare R2
 */
export function getR2UploadHistory(): R2UploadResult[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_R2_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Appends an upload result to the R2 history
 */
export function appendR2UploadHistory(item: R2UploadResult): void {
  try {
    const history = getR2UploadHistory();
    const updated = [item, ...history.filter((h) => h.objectKey !== item.objectKey)].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_R2_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not store upload history item:', err);
  }
}

/**
 * Checks server-side R2 integration status
 */
export async function fetchR2Status(): Promise<R2StatusInfo> {
  try {
    const res = await fetch('/api/r2-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch R2 status:', err);
  }
  return {
    configured: false,
    bucket: 'touch4xai',
    accountId: '2752109d4d388476f42f329b6f68c629',
    hasDirectKeys: false,
    workerUrlConfigured: false,
    dashboardUrl: 'https://dash.cloudflare.com/2752109d4d388476f42f329b6f68c629/r2/default/buckets/touch4xai',
  };
}

/**
 * Step 1: Obtains a presigned upload URL ticket from the Cloudflare Worker or local backend proxy
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType = 'application/json',
  customWorkerUrl?: string
): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string; simulated?: boolean; message?: string }> {
  const workerEndpoint = customWorkerUrl || getSavedWorkerUrl();

  // If a dedicated worker endpoint is provided directly by the user
  if (workerEndpoint && workerEndpoint.startsWith('http')) {
    const target = workerEndpoint.endsWith('/api/get-upload-url')
      ? workerEndpoint
      : `${workerEndpoint.replace(/\/$/, '')}/api/get-upload-url`;

    try {
      const directWorkerRes = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType }),
      });

      if (directWorkerRes.ok) {
        return await directWorkerRes.json();
      }
    } catch (err) {
      console.warn('Direct worker fetch failed, falling back to server proxy:', err);
    }
  }

  // Server proxy route
  const res = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      contentType,
      customWorkerUrl: workerEndpoint || undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain R2 presigned upload URL: ${errText || res.statusText}`);
  }

  return await res.json();
}

/**
 * Uploads a physical metrology dataset directly to Cloudflare R2 (touch4xai bucket)
 * 
 * Supports:
 * - Direct Presigned PUT to Cloudflare R2 bucket endpoint
 * - Graceful fallback to backend direct upload if client-side CORS is not yet applied
 */
export async function uploadDatasetToCloudflareR2(
  dataset: any,
  filename: string,
  options?: {
    customWorkerUrl?: string;
    onProgress?: (step: 'ticket' | 'uploading' | 'verifying' | 'done') => void;
  }
): Promise<R2UploadResult> {
  const payloadString = typeof dataset === 'string' ? dataset : JSON.stringify(dataset, null, 2);
  const byteSize = new Blob([payloadString]).size;
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  options?.onProgress?.('ticket');

  // Step 1: Request upload ticket
  const ticket = await getPresignedUploadUrl(cleanFilename, 'application/json', options?.customWorkerUrl);

  options?.onProgress?.('uploading');

  // Step 2: Stream directly to Cloudflare R2 via Presigned PUT
  try {
    const putResponse = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payloadString,
    });

    if (!putResponse.ok) {
      throw new Error(`R2 direct PUT returned status ${putResponse.status}: ${putResponse.statusText}`);
    }

    options?.onProgress?.('done');

    const result: R2UploadResult = {
      success: true,
      objectKey: ticket.objectKey,
      uploadUrl: ticket.uploadUrl,
      publicUrl: ticket.publicUrl,
      simulated: ticket.simulated,
      message: ticket.message || 'Successfully uploaded directly to Cloudflare R2 touch4xai bucket.',
      timestamp: new Date().toISOString(),
      filename: cleanFilename,
      byteSize,
    };

    appendR2UploadHistory(result);
    return result;
  } catch (directPutError: any) {
    console.warn('Direct client-side PUT to R2 failed (possibly CORS or network). Trying server fallback proxy...', directPutError);

    // Step 3: Fallback server-side upload proxy to guarantee dataset storage
    options?.onProgress?.('verifying');
    const fallbackRes = await fetch('/api/upload-r2-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: cleanFilename,
        payload: dataset,
        contentType: 'application/json',
      }),
    });

    if (!fallbackRes.ok) {
      const errText = await fallbackRes.text();
      throw new Error(`Direct R2 upload failed (${directPutError.message}), and server fallback also failed: ${errText}`);
    }

    const fallbackData = await fallbackRes.json();
    options?.onProgress?.('done');

    const result: R2UploadResult = {
      success: true,
      objectKey: fallbackData.objectKey || ticket.objectKey,
      publicUrl: fallbackData.publicUrl || ticket.publicUrl,
      simulated: fallbackData.simulated,
      message: fallbackData.message || 'Dataset securely saved to Cloudflare R2 bucket touch4xai via edge bridge.',
      timestamp: new Date().toISOString(),
      filename: cleanFilename,
      byteSize,
    };

    appendR2UploadHistory(result);
    return result;
  }
}
