// supabase/functions/send-push-notification/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function: Send Push Notification
//
// Triggered by a Postgres trigger on notifications INSERT.
// Forwards the notification to the user's device via Expo Push API.
//
// Flow:
//   1. Receive payload: { user_id, type, title, body, data }
//   2. Fetch user's Expo push token from profiles.expo_push_token
//   3. If token exists, send to Expo Push API:
//      POST https://exp.host/--/api/v2/push/send
//      { to: token, title, body, data, sound: 'default' }
//   4. Handle ticket response — store ticket_id for receipt checking
//
// Notification types and their push titles:
//   - connection_request: "[Name] wants to connect"
//   - vouch_received: "[Name] vouched for you"
//   - bid_new: "New bid on [Job Title]"
//   - bid_accepted: "Your bid was accepted!"
//   - message_new: "New message from [Name]"
//
// Note: profiles.expo_push_token column needs to be added to schema
// when push notifications are enabled. Not yet in schema.sql.
//
// Deploy: supabase functions deploy send-push-notification --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // TODO: Implement Expo Push API integration
  // Requires expo_push_token column on profiles table

  return new Response(
    JSON.stringify({ error: 'Not implemented — add expo_push_token column first' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
