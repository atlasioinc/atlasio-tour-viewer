// supabase/functions/stripe-connect-onboarding/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Stripe Connect Onboarding
//
// Creates a Stripe Connect Express account for a contractor,
// stores the stripe_account_id on their profile, and returns
// an onboarding URL to complete identity verification.
//
// Flow:
//   1. Receive { user_id } from authenticated client
//   2. Check if contractor already has stripe_account_id
//   3. If not, create Stripe Connect Express account
//   4. Store stripe_account_id on profiles
//   5. Create Account Link (onboarding URL)
//   6. Return { url, account_id }
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy stripe-connect-onboarding --no-verify-jwt
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, return_url, refresh_url } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 1. Check if contractor already has a Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, name, role')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: corsHeaders },
      );
    }

    let accountId = profile.stripe_account_id;

    // 2. Create Stripe Connect Express account if needed
    if (!accountId) {
      const createResponse = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          'capabilities[transfers][requested]': 'true',
          'metadata[user_id]': user_id,
          'metadata[role]': profile.role,
        }),
      });

      const account = await createResponse.json();
      if (!createResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Stripe account creation failed', details: account.error?.message }),
          { status: 500, headers: corsHeaders },
        );
      }

      accountId = account.id;

      // 3. Store on profile
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user_id);
    }

    // 4. Create Account Link for onboarding
    const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: accountId,
        type: 'account_onboarding',
        return_url: return_url || 'atlasio://stripe-onboarding-complete',
        refresh_url: refresh_url || 'atlasio://stripe-onboarding-refresh',
      }),
    });

    const link = await linkResponse.json();
    if (!linkResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to create onboarding link', details: link.error?.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ url: link.url, account_id: accountId }),
      { headers: corsHeaders },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
