// supabase/functions/filter-phone-numbers/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Filter Phone Numbers from Messages
//
// Triggered via webhook on messages INSERT.
// Strips phone numbers from message content to prevent users
// from exchanging contact info outside the platform.
//
// Patterns matched:
//   - (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx
//   - +1xxxxxxxxxx, 1xxxxxxxxxx
//   - 10-digit sequences
//   - Digits separated by spaces (e.g. "5 5 5 1 2 3 4 5 6 7")
//
// Deploy: supabase functions deploy filter-phone-numbers --no-verify-jwt
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

const REPLACEMENT = '[phone number removed]';

// Phone number regex patterns
const PHONE_PATTERNS: RegExp[] = [
  // (xxx) xxx-xxxx or (xxx)xxx-xxxx
  /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  // +1xxxxxxxxxx or 1xxxxxxxxxx (11 digits with country code)
  /\+?1\d{10}/g,
  // 10 digits in a row
  /\b\d{10}\b/g,
  // Digits separated by spaces (7+ digits): "5 5 5 1 2 3 4 5 6 7"
  /(?:\d\s){6,}\d/g,
];

function filterPhoneNumbers(content: string): { filtered: string; changed: boolean } {
  let result = content;
  let changed = false;

  for (const pattern of PHONE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(result)) {
      changed = true;
      pattern.lastIndex = 0;
      result = result.replace(pattern, REPLACEMENT);
    }
  }

  return { filtered: result, changed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support webhook payload
    const record = body.record ?? body;
    const messageId = record.id;
    const content = record.content;

    if (!messageId || !content) {
      return new Response(
        JSON.stringify({ error: 'Message id and content are required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Skip system messages
    if (record.type === 'system') {
      return new Response(
        JSON.stringify({ filtered: false, reason: 'system_message' }),
        { headers: corsHeaders },
      );
    }

    const { filtered, changed } = filterPhoneNumbers(content);

    if (changed) {
      const { error } = await supabase
        .from('messages')
        .update({ content: filtered })
        .eq('id', messageId);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to update message', details: error.message }),
          { status: 500, headers: corsHeaders },
        );
      }
    }

    return new Response(
      JSON.stringify({ filtered: changed }),
      { headers: corsHeaders },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
