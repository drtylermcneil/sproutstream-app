// Stripe loads from CDN at runtime — no npm package needed
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export const STRIPE_CONFIGURED =
  stripeKey && !stripeKey.includes('your-stripe')

let stripePromise = null
export async function getStripe() {
  if (!STRIPE_CONFIGURED) return null
  if (!stripePromise) {
    // Dynamic CDN load — works on Cloudflare Pages without a bundled package
    const { loadStripe } = await import(/* @vite-ignore */ 'https://js.stripe.com/v3/pure')
    stripePromise = loadStripe(stripeKey)
  }
  return stripePromise
}

// ── Checkout helper ───────────────────────────────────────────
// Call this after signup to redirect user to Stripe payment.
// Requires a Supabase Edge Function "create-checkout-session" that
// creates the Stripe session server-side using your secret key.
//
// Usage: await redirectToCheckout(user.email, user.id)
export async function redirectToCheckout(email, userId) {
  if (!STRIPE_CONFIGURED) {
    console.warn('Stripe not configured — skipping checkout redirect.')
    return
  }

  // This calls your Supabase Edge Function (server-side, has secret key)
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId }),
    }
  )

  const { sessionId, error } = await response.json()
  if (error) throw new Error(error)

  const stripe = await getStripe()
  await stripe.redirectToCheckout({ sessionId })
}
