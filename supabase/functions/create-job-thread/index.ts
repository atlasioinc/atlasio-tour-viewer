// supabase/functions/create-job-thread/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Create Job Thread
//
// Triggered when a contractor submits a bid on a job.
// Creates (or finds) a messaging thread between the agent and
// bidding contractor, linked to the job.
//
// Input: Supabase webhook payload { record: { job_id, contractor_id } }
// or direct call { job_id, contractor_id }
//
// Tables: threads (type='job_thread'), thread_members, messages
// Deploy: supabase functions deploy create-job-thread --no-verify-jwt
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
    const body = await req.json();

    // Support both webhook payload and direct call
    const job_id = body.record?.job_id ?? body.job_id;
    const contractor_id = body.record?.contractor_id ?? body.contractor_id;

    if (!job_id || !contractor_id) {
      return new Response(
        JSON.stringify({ error: 'job_id and contractor_id are required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 1. Fetch job to get agent_id and title
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('agent_id, title')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found', details: jobError?.message }),
        { status: 404, headers: corsHeaders },
      );
    }

    // 2. Check if a job_thread already exists for this job + contractor
    const { data: existingThreads } = await supabase
      .from('threads')
      .select('id, thread_members!inner(user_id)')
      .eq('job_id', job_id)
      .eq('type', 'job_thread')
      .eq('thread_members.user_id', contractor_id);

    if (existingThreads && existingThreads.length > 0) {
      return new Response(
        JSON.stringify({ thread_id: existingThreads[0].id, existing: true }),
        { headers: corsHeaders },
      );
    }

    // 3. Create new thread
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        type: 'job_thread',
        job_id,
        name: job.title,
      })
      .select('id')
      .single();

    if (threadError || !thread) {
      return new Response(
        JSON.stringify({ error: 'Failed to create thread', details: threadError?.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 4. Add both members
    const { error: membersError } = await supabase
      .from('thread_members')
      .insert([
        { thread_id: thread.id, user_id: job.agent_id },
        { thread_id: thread.id, user_id: contractor_id },
      ]);

    if (membersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to add thread members', details: membersError.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    // 5. Insert system message
    await supabase
      .from('messages')
      .insert({
        thread_id: thread.id,
        sender_id: job.agent_id,
        sender_name: 'System',
        content: `Bid submitted for "${job.title}"`,
        type: 'system',
      });

    return new Response(
      JSON.stringify({ thread_id: thread.id, existing: false }),
      { headers: corsHeaders },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
