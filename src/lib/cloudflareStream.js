// ── Cloudflare Stream integration ────────────────────────────
// Upload and playback via Cloudflare Stream.
// API token stays server-side (Supabase Edge Function).
// Only the account ID and customer subdomain are safe to expose here.

const accountId        = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
const customerSubdomain = import.meta.env.VITE_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN

export const STREAM_CONFIGURED =
  accountId && !accountId.includes('your-cloudflare')

// ── Get a one-time upload URL (calls Supabase Edge Function) ──
// The edge function calls Cloudflare Stream API server-side with your API token.
// Returns a { uploadURL, videoId } object.
export async function getUploadUrl(filename, fileSize) {
  if (!STREAM_CONFIGURED) {
    console.warn('Cloudflare Stream not configured — upload disabled.')
    return null
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-upload-url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileSize }),
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data // { uploadURL, videoId }
}

// ── Upload a file to Cloudflare Stream using the one-time URL ──
export async function uploadVideo(file, onProgress) {
  const upload = await getUploadUrl(file.name, file.size)
  if (!upload) return null

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', upload.uploadURL)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(upload.videoId)
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Upload network error')))

    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })
}

// ── Get HLS stream URL for a video ID ─────────────────────────
export function getStreamUrl(videoId) {
  if (!customerSubdomain) return null
  return `https://${customerSubdomain}/${videoId}/manifest/video.m3u8`
}

// ── Get thumbnail URL for a video ID ──────────────────────────
export function getThumbnailUrl(videoId, time = 0) {
  if (!customerSubdomain) return null
  return `https://${customerSubdomain}/${videoId}/thumbnails/thumbnail.jpg?time=${time}s`
}
