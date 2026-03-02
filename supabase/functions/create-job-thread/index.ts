// supabase/functions/create-job-thread/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Create Job Thread
//
// Triggered when a contractor submits a bid on a job.
// Automatically creates (or finds) a messaging thread between
// the agent and bidding contractor, linked to the job.
//
// Flow:
//   1. Receive payload: { job_id, contractor_id }
//   2. Fetch job to get agent_id
//   3. Check if a thread already exists for this job + contractor pair
//   4. If not, create thread (type='job_thread', job_id set)
//   5. Add both agent and contractor as thread_members
//   6. Insert system message: "Bid submitted for [job title]"
//   7. Return thread_id
//
// This enables the agent to message the contractor directly from
// the bid card in RepairJobDetails.
//
// Deploy: supabase functions deploy create-job-thread --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // TODO: Implement job thread auto-creation on bid submission
  // Can also be triggered as a Postgres trigger via pg_net

  return new Response(
    JSON.stringify({ error: 'Not implemented' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
