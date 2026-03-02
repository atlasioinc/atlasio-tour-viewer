// supabase/functions/send-vouch-prompts/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Send Vouch Prompts (Cron)
//
// Runs hourly via Supabase cron. Finds completed jobs where the
// agent confirmed > 1 hour ago but hasn't been prompted to vouch
// for the contractor, then inserts a vouch notification.
//
// Query:
//   jobs WHERE agent_confirmed_at IS NOT NULL
//     AND agent_confirmed_at < now() - interval '1 hour'
//     AND vouch_prompt_sent = false
//
// For each match:
//   - INSERT notification (type='vouch_prompt') to the agent
//   - UPDATE jobs SET vouch_prompt_sent = true
//
// Cron config (in Supabase Dashboard → Edge Functions → Schedules):
//   Schedule: every 1 hour
//   HTTP method: POST
//   Body: {}
//
// Deploy: supabase functions deploy send-vouch-prompts --no-verify-jwt
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Find jobs ready for vouch prompts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, agent_id, title, awarded_bid_id')
      .not('agent_confirmed_at', 'is', null)
      .lt('agent_confirmed_at', oneHourAgo)
      .eq('vouch_prompt_sent', false);

    if (jobsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to query jobs', details: jobsError.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ prompted: 0 }),
        { headers: corsHeaders },
      );
    }

    let prompted = 0;

    for (const job of jobs) {
      // Get the contractor from the awarded bid
      let contractorName = 'the contractor';
      if (job.awarded_bid_id) {
        const { data: bid } = await supabase
          .from('bids')
          .select('contractor_id, profiles!bids_contractor_id_fkey(name)')
          .eq('id', job.awarded_bid_id)
          .single();

        if (bid?.profiles) {
          contractorName = (bid.profiles as { name: string }).name;
        }
      }

      // Insert vouch prompt notification
      await supabase.from('notifications').insert({
        user_id: job.agent_id,
        type: 'vouch_prompt',
        title: 'How was the work?',
        subtitle: `Vouch for ${contractorName} on "${job.title}"`,
        job_id: job.id,
      });

      // Mark as sent
      await supabase
        .from('jobs')
        .update({ vouch_prompt_sent: true })
        .eq('id', job.id);

      prompted++;
    }

    return new Response(
      JSON.stringify({ prompted }),
      { headers: corsHeaders },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
