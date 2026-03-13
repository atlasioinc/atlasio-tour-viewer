// supabase/functions/send-squad-email/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Send Squad Email
//
// WHAT: Sends a branded HTML email to a homebuyer/seller with
//       their agent's assembled Closing Squad.
// CALLED BY: useSquadShare.sendViaEmail() in hooks/useData.ts
// TRIGGER: Manual frontend call via supabase.functions.invoke()
// SERVICE: Resend API (https://resend.com)
// REQUIRES: RESEND_API_KEY in Supabase secrets
//
// Deploy: supabase functions deploy send-squad-email --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

// @backend: Resend API — POST https://api.resend.com/emails
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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
  avatar_url?: string;      // profile photo URL from Supabase storage
  avatar_color?: string;    // hex color string e.g. '#3B82F6' — used as initials circle background
}

interface EmailParams {
  squadMembers: SquadMember[];
  agentName: string;
  agentCompany: string;
  recipientEmail: string;
  personalMessage?: string;
}

// ─── Helper: Extract initials from a name ─────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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

// ─── Helper: Generate branded HTML email ──────────────────────────────────────
// Table-based layout with 100% inline styles for maximum email client
// compatibility (Gmail, Outlook, Apple Mail, Yahoo). No flexbox, no CSS Grid,
// no <style> blocks, no web fonts. System font stack only.
//
// Layout: 600px centered table on #F7F7FC background
// Sections: Header → Intro → Personal Message (optional) → Squad Cards → Footer

function generateEmailHtml(params: {
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
    <tr>
      <td style="padding: 0 40px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F4F7FF; border-left: 3px solid #003DC3; border-radius: 0 8px 8px 0;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0; font-size: 15px; font-weight: 400; color: #4A5565; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                ${escapeHtml(personalMessage)}
              </p>
              <p style="margin: 10px 0 0; font-size: 13px; font-weight: 600; color: #003DC3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                &mdash; ${escapedAgentName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : '';

  // ── Squad Member Cards ────────────────────────────────────────────────────
  const squadCardsHtml = squadMembers
    .map((member) => {
      // Avatar: circular photo if avatar_url exists, otherwise initials circle
      const avatarHtml = member.avatar_url
        ? `<div style="width:56px; height:56px; border-radius:50%; overflow:hidden; border:2px solid #FFFFFF; display:inline-block;"><img src="${escapeHtml(member.avatar_url)}" alt="${escapeHtml(member.name)}" width="56" height="56" style="width:56px; height:56px; display:block; object-fit:cover;" /></div>`
        : `<div style="width:56px; height:56px; border-radius:50%; overflow:hidden; border:2px solid #FFFFFF; background-color:${escapeHtml(member.avatar_color || '#3B82F6')}; display:inline-block;"><table cellpadding="0" cellspacing="0" border="0" width="56" height="56" style="width:56px; height:56px;"><tr><td width="56" height="56" align="center" valign="middle" style="width:56px; height:56px; font-size:18px; font-weight:600; color:#FFFFFF; font-family:Arial,sans-serif; text-align:center; vertical-align:middle;">${escapeHtml(getInitials(member.name))}</td></tr></table></div>`;

      return `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 10px;">
          <tr>
            <td valign="middle" style="padding: 16px 0 16px 20px; width: 56px;">
              ${avatarHtml}
            </td>
            <td valign="middle" style="padding: 16px 20px 16px 12px;">
              <!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
              <span style="display: inline-block; background-color: #EFF6FF; border-radius: 100px; padding: 3px 10px; font-size: 11px; font-weight: 600; color: #003DC3; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                ${escapeHtml(member.role)}
              </span>
              <!--[if mso]></td></tr></table><![endif]-->
              <p style="margin: 8px 0 0; font-size: 16px; font-weight: 700; color: #1C1C1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                ${escapeHtml(member.name)}
              </p>
              <p style="margin: 2px 0 0; font-size: 13px; font-weight: 400; color: #757575; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                ${escapeHtml(member.company)}
              </p>
            </td>
          </tr>
        </table>`;
    })
    .join('\n');

  // ── Full Email HTML ───────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapedAgentName} has assembled your closing team</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7FC; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

<!-- ── OUTER WRAPPER ─────────────────────────────────────────────────────── -->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F7F7FC;">
  <tr>
    <td align="center" style="padding: 32px 16px;">

      <!-- ── INNER CONTAINER (600px max) ───────────────────────────────── -->
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px;">

        <!-- ── HEADER ──────────────────────────────────────────────────── -->
        <tr>
          <td style="padding: 32px 40px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <!-- Wordmark -->
            <p style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #003DC3; text-transform: uppercase; font-family: Arial, sans-serif;">
              ATLASIO
            </p>
            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 16px 0;">
          </td>
        </tr>

        <!-- ── INTRO ───────────────────────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1C1C1E; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
              Your Closing Team is Ready
            </h1>
            <p style="margin: 6px 0 0; font-size: 14px; font-weight: 400; color: #757575; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
              Assembled by ${escapedAgentName} &middot; ${escapedAgentCompany}
            </p>
          </td>
        </tr>

        <!-- ── PERSONAL MESSAGE (conditional) ──────────────────────────── -->
        ${personalMessageHtml}

        <!-- ── SQUAD CARDS ─────────────────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; color: #757575; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
              YOUR TEAM
            </p>
            ${squadCardsHtml}
          </td>
        </tr>

        <!-- ── FOOTER ──────────────────────────────────────────────────── -->
        <tr>
          <td style="padding: 24px 40px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 0 0 20px;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #757575; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
              Sent via Atlasio &middot; The modern real estate marketplace
            </p>
            <p style="margin: 4px 0 0; font-size: 12px; font-weight: 400; color: #757575; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
              Questions? Reply to this email or contact ${escapedAgentName} directly.
            </p>
            <p style="margin: 12px 0 0; font-size: 11px; font-weight: 400; color: #99A1AF; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
              &copy; 2026 Atlasio &middot; atlasioapp.com
            </p>
          </td>
        </tr>

      </table>
      <!-- /INNER CONTAINER -->

    </td>
  </tr>
</table>
<!-- /OUTER WRAPPER -->

</body>
</html>`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight — required for mobile app calls
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: EmailParams = await req.json();
    const {
      squadMembers,
      agentName,
      agentCompany,
      recipientEmail,
      personalMessage,
    } = body;

    // VALIDATE: Required fields
    if (!squadMembers || !agentName || !recipientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // FILTER: Only send filled members (name and role must be present)
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

    // GENERATE: Branded HTML email
    const html = generateEmailHtml({
      squadMembers: filledMembers,
      agentName,
      agentCompany,
      personalMessage,
    });

    // @backend: Resend API — POST https://api.resend.com/emails
    // Requires RESEND_API_KEY secret + verified sending domain (atlasioapp.com)
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Atlasio <noreply@updates.atlasioapp.com>',
        to: recipientEmail,
        subject: `${agentName} has assembled your closing team`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Email send failed' }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('send-squad-email error:', err);
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
