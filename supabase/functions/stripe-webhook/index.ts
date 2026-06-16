// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook
// In Stripe Dashboard → Webhooks → add endpoint:
//   https://<project>.supabase.co/functions/v1/stripe-webhook
// Events to listen for:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed
// Env vars needed:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET  (from Stripe webhook dashboard)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")!
  const body      = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    )
  } catch (err) {
    return new Response(`Webhook signature error: ${err}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const sub = event.data.object as Stripe.Subscription

  // Map Stripe subscription status → our status
  function mapStatus(stripeStatus: string): string {
    if (stripeStatus === "active" || stripeStatus === "trialing") return stripeStatus === "trialing" ? "trialing" : "active"
    if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired") return "canceled"
    if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due"
    return "canceled"
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const customerId = sub.customer as string
      await supabase
        .from("profiles")
        .update({
          subscription_status:    mapStatus(sub.status),
          stripe_subscription_id: sub.id,
        })
        .eq("stripe_customer_id", customerId)
      break
    }
    case "customer.subscription.deleted": {
      await supabase
        .from("profiles")
        .update({ subscription_status: "canceled", stripe_subscription_id: null })
        .eq("stripe_subscription_id", sub.id)
      break
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice
      await supabase
        .from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("stripe_customer_id", inv.customer as string)
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
