// supabase/functions/process-stripe-fee/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Process Stripe Fee
//
// Called after a bid is accepted and acceptance_fee is calculated
// by the `calculate_acceptance_fee()` trigger.
//
// Creates a Stripe PaymentIntent with application_fee_amount,
// then marks bids.fee_paid = true.
//
// Fee tiers (from fee_tier_enum):
//   - free:           0% (first 3 jobs)
//   - early_adopter:  5% (months 4–9), min $15
//   - standard:       10% (10+ months), min $15
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy process-stripe-fee --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bid_id } = await req.json();
    if (!bid_id) {
      return new Response(
        JSON.stringify({ error: 'bid_id is required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 1. Fetch bid details
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('id, amount, acceptance_fee, fee_paid, contractor_id, status')
      .eq('id', bid_id)
      .single();

    if (bidError || !bid) {
      return new Response(
        JSON.stringify({ error: 'Bid not found', details: bidError?.message }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (bid.status !== 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Bid is not in accepted status' }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (bid.fee_paid) {
      return new Response(
        JSON.stringify({ success: true, fee: bid.acceptance_fee, skipped: true, reason: 'already_paid' }),
        { headers: corsHeaders },
      );
    }

    // 2. If acceptance_fee is 0 (free tier) → skip Stripe
    if (bid.acceptance_fee === 0) {
      await supabase
        .from('bids')
        .update({ fee_paid: true })
        .eq('id', bid_id);

      return new Response(
        JSON.stringify({ success: true, fee: 0, skipped: true, reason: 'free_tier' }),
        { headers: corsHeaders },
      );
    }

    // 3. Fetch contractor profile for stripe_account_id
    const { data: contractor, error: contractorError } = await supabase
      .from('profiles')
      .select('stripe_account_id, fee_tier')
      .eq('id', bid.contractor_id)
      .single();

    if (contractorError || !contractor) {
      return new Response(
        JSON.stringify({ error: 'Contractor profile not found' }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (!contractor.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Contractor has no Stripe account. Complete onboarding first.' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 4. Create Stripe PaymentIntent with application fee + transfer
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(bid.amount),
        currency: 'usd',
        application_fee_amount: String(bid.acceptance_fee),
        'transfer_data[destination]': contractor.stripe_account_id,
        'metadata[bid_id]': bid_id,
        'metadata[contractor_id]': bid.contractor_id,
        'metadata[fee_tier]': contractor.fee_tier,
      }),
    });

    const paymentIntent = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Stripe error', details: paymentIntent.error?.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 5. Mark fee as paid
    await supabase
      .from('bids')
      .update({ fee_paid: true })
      .eq('id', bid_id);

    return new Response(
      JSON.stringify({
        success: true,
        fee: bid.acceptance_fee,
        payment_intent_id: paymentIntent.id,
      }),
      { headers: corsHeaders },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
