// supabase/functions/send-push-notification/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Send Push Notification
//
// Triggered by a webhook on notifications INSERT.
// Looks up user's push tokens from the `push_tokens` table,
// then sends via Expo Push API.
//
// Input: webhook payload { record: { user_id, title, subtitle, type } }
// Table: push_tokens (user_id, token, is_active)
//
// Deploy: supabase functions deploy send-push-notification --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support webhook payload
    const record = body.record ?? body;
    const { user_id, title, subtitle, type } = record;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 1. Fetch active push tokens for this user
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (tokensError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens', details: tokensError.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'no_active_tokens' }),
        { headers: corsHeaders },
      );
    }

    // 2. Build Expo push messages
    const messages = tokens.map((t) => ({
      to: t.token,
      title: title || 'Atlasio',
      body: subtitle || '',
      sound: 'default' as const,
      data: { type },
    }));

    // 3. Send to Expo Push API
    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const tickets = await expoResponse.json();

    if (!expoResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Expo Push API error', details: tickets }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({
        sent: true,
        token_count: tokens.length,
        tickets: tickets.data ?? tickets,
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
