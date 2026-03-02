// supabase/functions/filter-phone-numbers/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Filter Phone Numbers from Messages
//
// Runs as a Postgres trigger (via pg_net) on messages INSERT.
// Strips phone numbers from message content to prevent users
// from exchanging contact info outside the platform.
//
// Regex patterns to match:
//   - (xxx) xxx-xxxx
//   - xxx-xxx-xxxx
//   - xxx.xxx.xxxx
//   - +1xxxxxxxxxx
//   - 10-digit sequences
//
// Replacement: "[phone number removed]"
//
// Also checks for common obfuscation:
//   - "five five five" → potential phone number
//   - Digits separated by spaces: "5 5 5 1 2 3 4 5 6 7"
//
// Deploy: supabase functions deploy filter-phone-numbers --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // TODO: Implement phone number regex filtering on message content
  // Update the message row in-place after stripping numbers

  return new Response(
    JSON.stringify({ error: 'Not implemented' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
