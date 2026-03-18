// supabase/functions/send-closing-update/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Send Closing Update SMS
//
// WHAT: When a partner updates a milestone on a deal that has a
//       client token, detects if the closing phase has advanced
//       and sends the client an SMS with a link to their closing page.
// TRIGGER: Database webhook on deal_milestones INSERT or UPDATE
// SERVICES: Twilio SMS API
// REQUIRES: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
//           in Supabase secrets. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//           are auto-available.
//
// Deploy: supabase functions deploy send-closing-update --no-verify-jwt
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

// ─── Closing Phases (must match lib/closingPhases.ts in atlasio-closing) ──────

const CLOSING_PHASES = [
  { key: 'loan_application', milestoneKeys: ['pre_approval', 'app_submitted', 'appraisal_ordered', 'appraisal_complete'] },
  { key: 'title_search', milestoneKeys: ['title_search', 'lien_search', 'title_commitment'] },
  { key: 'under_review', milestoneKeys: ['underwriting', 'conditional_approval'] },
  { key: 'clear_to_close', milestoneKeys: ['clear_to_close'] },
  { key: 'closing_day', milestoneKeys: ['loan_docs_sent', 'closing_docs'] },
];

const PHASE_LABELS: Record<string, string> = {
  loan_application: 'Loan application',
  title_search: 'Title search',
  under_review: 'Under review',
  clear_to_close: 'Clear to close',
  closing_day: 'Closing day',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealMilestone {
  id: string;
  transaction_id: string;
  milestone_key: string;
  status: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: DealMilestone;
  old_record?: DealMilestone;
}

// ─── Helper: Compute current closing phase index ──────────────────────────────
// Returns the index of the highest phase where ALL milestoneKeys are 'complete'.
// Returns -1 if no phase is fully complete.

function computePhaseIndex(milestones: { milestone_key: string; status: string }[]): number {
  const statusMap = new Map<string, string>();
  for (const m of milestones) {
    statusMap.set(m.milestone_key, m.status);
  }

  let highestComplete = -1;
  for (let i = 0; i < CLOSING_PHASES.length; i++) {
    const phase = CLOSING_PHASES[i];
    const allComplete = phase.milestoneKeys.every(
      (key) => statusMap.get(key) === 'complete',
    );
    if (allComplete) {
      highestComplete = i;
    } else {
      break; // Phases are sequential — stop at first incomplete
    }
  }
  return highestComplete;
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { type, record, old_record } = payload;

    // Step 1 — Check if this milestone belongs to a transaction
    if (!record.transaction_id) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No transaction_id' }),
        { headers: corsHeaders },
      );
    }

    // Step 2 — Get transaction data
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, property_address, closing_date, notify_phone, client_token')
      .eq('id', record.transaction_id)
      .single();

    if (txError || !transaction) {
      console.error('Transaction lookup error:', txError);
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { headers: corsHeaders },
      );
    }

    if (!transaction.notify_phone) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No notify_phone' }),
        { headers: corsHeaders },
      );
    }

    if (!transaction.client_token) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No client_token' }),
        { headers: corsHeaders },
      );
    }

    // Step 3 — Get all milestones for this transaction
    const { data: allMilestones, error: msError } = await supabase
      .from('deal_milestones')
      .select('milestone_key, status')
      .eq('transaction_id', record.transaction_id);

    if (msError || !allMilestones) {
      console.error('Milestones lookup error:', msError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch milestones' }),
        { headers: corsHeaders },
      );
    }

    // Step 4 — Detect phase advance
    const currentPhaseIndex = computePhaseIndex(allMilestones);

    // Compute previous phase index
    let previousMilestones: { milestone_key: string; status: string }[];

    if (type === 'UPDATE' && old_record) {
      // Swap current record with old_record in the milestone list
      previousMilestones = allMilestones.map((m) =>
        m.milestone_key === record.milestone_key
          ? { milestone_key: old_record.milestone_key, status: old_record.status }
          : m,
      );
    } else {
      // INSERT — remove the new record from the list
      previousMilestones = allMilestones.filter(
        (m) => m.milestone_key !== record.milestone_key,
      );
    }

    const previousPhaseIndex = computePhaseIndex(previousMilestones);

    if (currentPhaseIndex <= previousPhaseIndex) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No phase advance' }),
        { headers: corsHeaders },
      );
    }

    // Step 5 — Calculate days to closing
    const daysToClose = transaction.closing_date
      ? Math.ceil(
          (new Date(transaction.closing_date).getTime() - Date.now()) / 86400000,
        )
      : null;

    // Step 6 — Send SMS via Twilio
    const url = `https://closing.atlasioapp.com/${transaction.client_token}`;
    const phaseName = PHASE_LABELS[CLOSING_PHASES[currentPhaseIndex].key];
    const message =
      daysToClose && daysToClose > 0
        ? `Your closing at ${transaction.property_address} just advanced — ${phaseName}. ${daysToClose} days to closing. ${url}`
        : `Your closing at ${transaction.property_address} just advanced — ${phaseName}. ${url}`;

    const smsSent = await sendTwilioSms(transaction.notify_phone, message);

    if (!smsSent) {
      console.error('SMS send failed for transaction:', transaction.id);
      return new Response(
        JSON.stringify({ success: false, error: 'SMS send failed' }),
        { headers: corsHeaders },
      );
    }

    console.log(
      `Closing update SMS sent for transaction ${transaction.id} — phase advanced to ${phaseName}`,
    );

    return new Response(
      JSON.stringify({ success: true, phase: phaseName, smsSent: true }),
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('send-closing-update error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal error',
        details: (err as Error).message,
      }),
      { headers: corsHeaders },
    );
  }
});
