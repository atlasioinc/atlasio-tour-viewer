// supabase/functions/send-squad-sms/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Send Squad SMS
//
// WHAT: Generates a mobile-optimized HTML page for the client's
//       closing squad, uploads to Supabase Storage (squad-pdfs
//       bucket), then sends an SMS via Twilio with the public URL.
// CALLED BY: useSquadShare.sendViaSms() in hooks/useData.ts
// TRIGGER: Manual frontend call via supabase.functions.invoke()
// SERVICES: Supabase Storage (squad-pdfs bucket), Twilio SMS API
// REQUIRES: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
//           in Supabase secrets. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//           are auto-available.
//
// Deploy: supabase functions deploy send-squad-sms --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @backend: Twilio SMS API — POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SquadMember {
  name: string;
  company: string;
  role: string;
}

interface SmsParams {
  squadMembers: SquadMember[];
  agentName: string;
  agentCompany: string;
  recipientPhone: string;
  personalMessage?: string;
}

// ─── Helper: Escape HTML special characters ───────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Helper: Generate mobile-optimized HTML page ──────────────────────────────
// This is a standalone HTML page opened in Safari/Chrome when the client
// taps the SMS link. Pure HTML + inline CSS — no JavaScript, no external
// fonts, no dependencies. Loads instantly on mobile.
//
// Sections: Header (blue) → Personal Message (optional) → Squad Cards → Footer

function generateMobileHtml(params: {
  squadMembers: SquadMember[];
  agentName: string;
  agentCompany: string;
  personalMessage?: string;
}): string {
  const { squadMembers, agentName, agentCompany, personalMessage } = params;
  const escapedAgentName = escapeHtml(agentName);
  const escapedAgentCompany = escapeHtml(agentCompany);

  // ── Personal Message Block (conditional) ──────────────────────────────────
  const personalMessageHtml = personalMessage
    ? `
    <div style="background: #FFFFFF; margin: 16px; border-radius: 12px; padding: 16px 20px; border-left: 3px solid #003DC3;">
      <p style="margin: 0; font-size: 15px; font-weight: 400; color: #4A5565; line-height: 1.6;">
        ${escapeHtml(personalMessage)}
      </p>
      <p style="margin: 10px 0 0; font-size: 13px; font-weight: 600; color: #003DC3;">
        &mdash; ${escapedAgentName}
      </p>
    </div>`
    : '';

  // ── Squad Member Cards ────────────────────────────────────────────────────
  const squadCardsHtml = squadMembers
    .map(
      (member) => `
      <div style="background: #FFFFFF; margin: 0 16px 12px; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <span style="display: inline-block; background-color: #EFF6FF; color: #003DC3; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 100px;">
          ${escapeHtml(member.role)}
        </span>
        <p style="margin: 10px 0 0; font-size: 18px; font-weight: 700; color: #1C1C1E;">
          ${escapeHtml(member.name)}
        </p>
        <p style="margin: 3px 0 0; font-size: 14px; font-weight: 400; color: #757575;">
          ${escapeHtml(member.company)}
        </p>
        <!-- @backend: replace with tel: link when phone added to SquadShareMember -->
        <div style="background-color: #E5E7EB; color: #757575; border-radius: 10px; padding: 12px 20px; font-size: 15px; font-weight: 600; width: 100%; margin-top: 16px; text-align: center; box-sizing: border-box;">
          Contact info coming soon
        </div>
      </div>`,
    )
    .join('\n');

  // ── Full Mobile HTML Page ─────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="theme-color" content="#003DC3">
  <title>${escapedAgentName}'s Closing Team &middot; Atlasio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
      background: #F7F7FC;
      color: #1C1C1E;
      min-height: 100vh;
      -webkit-text-size-adjust: 100%;
    }
  </style>
</head>
<body>

  <!-- ── HEADER ──────────────────────────────────────────────────────────── -->
  <div style="background-color: #003DC3; padding: 32px 20px 24px;">
    <p style="margin: 0; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); letter-spacing: 3px; text-transform: uppercase;">
      ATLASIO
    </p>
    <h1 style="margin: 16px 0 0; font-size: 26px; font-weight: 700; color: #FFFFFF; line-height: 1.2;">
      Your Closing Team
    </h1>
    <p style="margin: 6px 0 0; font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.8);">
      Assembled by ${escapedAgentName} &middot; ${escapedAgentCompany}
    </p>
  </div>

  <!-- ── PERSONAL MESSAGE (conditional) ──────────────────────────────────── -->
  ${personalMessageHtml}

  <!-- ── SQUAD CARDS ─────────────────────────────────────────────────────── -->
  <div style="padding-top: ${personalMessage ? '0' : '16px'};">
    ${squadCardsHtml}
  </div>

  <!-- ── FOOTER ──────────────────────────────────────────────────────────── -->
  <div style="padding: 24px 20px 40px; text-align: center;">
    <p style="margin: 0; font-size: 12px; font-weight: 400; color: #757575;">
      Sent via Atlasio &middot; Your real estate closing platform
    </p>
    <p style="margin: 8px 0 0; font-size: 11px; font-weight: 400; color: #99A1AF;">
      This link expires in 30 days
    </p>
  </div>

</body>
</html>`;
}

// ─── Helper: Send SMS via Twilio ──────────────────────────────────────────────
// @backend: Twilio REST API — POST /2010-04-01/Accounts/{sid}/Messages.json
// Uses Basic auth with Account SID + Auth Token

async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER!,
      Body: body,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twilio API error:', error);
  }

  return response.ok;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight — required for mobile app calls
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SmsParams = await req.json();
    const {
      squadMembers,
      agentName,
      agentCompany,
      recipientPhone,
      personalMessage,
    } = body;

    // VALIDATE: Required fields
    if (!squadMembers || !agentName || !recipientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // FILTER: Only include filled members (name and role must be present)
    const filledMembers = squadMembers.filter(
      (m: SquadMember) => m.name && m.role,
    );
    if (filledMembers.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No filled squad members to send',
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    // GENERATE: Mobile-optimized HTML page
    const html = generateMobileHtml({
      squadMembers: filledMembers,
      agentName,
      agentCompany,
      personalMessage,
    });

    // UPLOAD: To Supabase Storage (squad-pdfs bucket, public)
    // @backend: Supabase Storage — squad-pdfs bucket (public, text/html only)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const fileName = `squad-${Date.now()}-${Math.random().toString(36).slice(2)}.html`;

    const { error: uploadError } = await supabase.storage
      .from('squad-pdfs')
      .upload(fileName, new Blob([html], { type: 'text/html' }), {
        contentType: 'text/html',
        cacheControl: '2592000', // 30 days
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate squad page',
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    // GET: Public URL for the uploaded HTML page
    const {
      data: { publicUrl },
    } = supabase.storage.from('squad-pdfs').getPublicUrl(fileName);

    // SEND: SMS via Twilio with the public URL
    const smsBody = `Hi! ${agentName} has shared your closing team with you. View your squad here: ${publicUrl}`;
    const smsSent = await sendTwilioSms(recipientPhone, smsBody);

    if (!smsSent) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS send failed' }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ success: true, pdfUrl: publicUrl }),
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('send-squad-sms error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal error',
        details: (err as Error).message,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
