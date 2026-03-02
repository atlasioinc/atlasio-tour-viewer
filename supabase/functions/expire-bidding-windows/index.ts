// supabase/functions/expire-bidding-windows/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Expire Bidding Windows (Cron)
//
// Runs hourly via Supabase cron. Finds open jobs where the
// bid_deadline has passed and marks them as expired. Notifies
// the agent so they can extend the deadline or award a bid.
//
// Query:
//   jobs WHERE status = 'open'
//     AND bid_deadline IS NOT NULL
//     AND bid_deadline < now()
//
// For each match:
//   - UPDATE jobs SET status = 'expired'
//   - INSERT notification to the agent
//
// Cron config (in Supabase Dashboard → Edge Functions → Schedules):
//   Schedule: every 1 hour
//   HTTP method: POST
//   Body: {}
//
// Deploy: supabase functions deploy expire-bidding-windows --no-verify-jwt
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
    const now = new Date().toISOString();

    // Find open jobs past their bid deadline
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, agent_id, title')
      .eq('status', 'open')
      .not('bid_deadline', 'is', null)
      .lt('bid_deadline', now);

    if (jobsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to query jobs', details: jobsError.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ expired: 0 }),
        { headers: corsHeaders },
      );
    }

    let expired = 0;

    for (const job of jobs) {
      // Update job status to expired
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'expired' })
        .eq('id', job.id);

      if (updateError) continue;

      // Notify the agent
      await supabase.from('notifications').insert({
        user_id: job.agent_id,
        type: 'bid_deadline_expired',
        title: 'Bidding window closed',
        subtitle: `"${job.title}" has passed its bid deadline`,
        job_id: job.id,
      });

      expired++;
    }

    return new Response(
      JSON.stringify({ expired }),
      { headers: corsHeaders },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
