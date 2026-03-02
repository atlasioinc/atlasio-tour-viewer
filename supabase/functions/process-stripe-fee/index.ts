// supabase/functions/process-stripe-fee/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Process Stripe Fee
//
// Triggered when a job is marked complete (agent_confirmed_at IS NOT NULL).
// Creates a Stripe PaymentIntent with a tiered application fee:
//   - Free tier (first 3 jobs): 0% fee
//   - Growth tier (months 4–9): 5% fee
//   - Standard tier (10+ months): 10% fee
//
// Fee tier is stored on profiles.fee_tier ('free' | 'growth' | 'standard')
// and updated by a separate trigger when completed_bids_count changes.
//
// Flow:
//   1. Receive webhook payload with job_id
//   2. Fetch job + awarded bid + contractor profile
//   3. Determine fee tier from contractor's profile
//   4. Calculate application_fee_amount based on tier
//   5. Create Stripe PaymentIntent with transfer + application fee
//   6. Update job with stripe_payment_intent_id
//
// Environment variables required:
//   STRIPE_SECRET_KEY — from Supabase Dashboard → Edge Functions → Secrets
//   STRIPE_WEBHOOK_SECRET — for verifying Stripe webhook signatures
//
// Deploy: supabase functions deploy process-stripe-fee --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // TODO: Implement Stripe PaymentIntent creation with tiered fee logic
  // See fee schedule: 0% (free), 5% (growth), 10% (standard)
  // Requires STRIPE_SECRET_KEY configured in Supabase Secrets

  return new Response(
    JSON.stringify({ error: 'Not implemented — configure Stripe keys first' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
