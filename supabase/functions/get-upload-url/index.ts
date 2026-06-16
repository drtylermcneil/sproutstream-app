// Supabase Edge Function: get-upload-url
// Deploy: supabase functions deploy get-upload-url
// Env vars needed:
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_STREAM_API_TOKEN

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { filename, fileSize, userId } = await req.json()

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!
    const apiToken  = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN")!

    // Request a one-time upload URL from Cloudflare Stream
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(fileSize),
          "Upload-Metadata": `name ${btoa(filename)}`,
        },
      }
    )

    if (!cfRes.ok) {
      const err = await cfRes.text()
      throw new Error(`Cloudflare error: ${err}`)
    }

    const uploadUrl = cfRes.headers.get("Location")!
    // Cloudflare Stream video ID is the last path segment of the stream URL header
    const streamUrl = cfRes.headers.get("Stream-Media-Id") ?? uploadUrl.split("/").pop()!

    // Pre-create the video row in Supabase so we can track status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: video, error } = await supabase
      .from("videos")
      .insert({
        user_id:    userId,
        title:      filename.replace(/\.[^/.]+$/, ""), // strip extension
        cf_video_id: streamUrl,
        status:     "processing",
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ uploadUrl, videoId: streamUrl, dbId: video.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
