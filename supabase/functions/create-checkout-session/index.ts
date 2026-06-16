// Supabase Edge Function: create-checkout-session
// Deploy: supabase functions deploy create-checkout-session
// Env vars needed (set in Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY
//   SITE_URL  (e.g. https://sproutstream.org)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { userId, email, planType = "monthly" } = await req.json()

    // Prices — create these in your Stripe dashboard and paste the price IDs
    const PRICES = {
      monthly: Deno.env.get("STRIPE_MONTHLY_PRICE_ID") ?? "price_monthly_placeholder",
      annual:  Deno.env.get("STRIPE_ANNUAL_PRICE_ID")  ?? "price_annual_placeholder",
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://sproutstream.org"

    // Create or retrieve Stripe customer
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } })
      customerId = customer.id
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: PRICES[planType as keyof typeof PRICES], quantity: 1 }],
      mode: "subscription",
      success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/?checkout=canceled`,
      subscription_data: {
        trial_period_days: 30,
        metadata: { supabase_user_id: userId },
      },
      allow_promotion_codes: true,
    })

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
