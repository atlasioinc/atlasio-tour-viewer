// supabase/functions/upload-insurance-document/index.ts
// ═══════════════════════════════════════════════════════════════
// Edge Function #10: Upload Insurance Document
//
// WHAT: Server-side upload to credentials bucket using service role key,
//       bypassing client-side RLS (42P17 infinite recursion bug).
// CALLED BY: useUploadInsuranceDocument() in hooks/useData.ts
// TRIGGER: Manual frontend call via supabase.functions.invoke()
//
// Deploy: supabase functions deploy upload-insurance-document --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

// @backend: Edge Function — server-side storage upload + RPC call
// @demo: insurance upload bypass for 42P17 storage bug

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────────

interface UploadInsuranceRequest {
  fileBase64: string;
  fileName: string;
  mimeType: string;
  expiryMonth: number;
  expiryYear: number;
  userId: string;
}

// ─── Main Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: UploadInsuranceRequest = await req.json();
    const { fileBase64, fileName, mimeType, expiryMonth, expiryYear, userId } = body;

    // Validate required fields
    if (!fileBase64 || !mimeType || !expiryMonth || !expiryYear || !userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields.' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Admin client for storage upload (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Step 1: Convert base64 → Uint8Array
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Step 2: Upload to credentials bucket (service role bypasses 42P17 bug)
    const filePath = `${userId}/coi-${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('credentials')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ success: false, message: uploadError.message }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Step 3: Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('credentials')
      .getPublicUrl(filePath);

    // Step 4: Call RPC using user's auth context (RPC uses auth.uid() internally)
    // Option A — user client with Authorization header from the request
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader ?? '' } },
      auth: { persistSession: false },
    });

    const { data: rpcData, error: rpcError } = await supabaseUser.rpc(
      'rpc_upload_insurance_document',
      {
        p_document_url: publicUrl,
        p_expiry_month: expiryMonth,
        p_expiry_year: expiryYear,
        p_doc_name: fileName,
      },
    );

    if (rpcError) {
      return new Response(
        JSON.stringify({ success: false, message: rpcError.message }),
        { status: 400, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Insurance document submitted for review.' }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message ?? 'Unexpected error' }),
      { status: 500, headers: corsHeaders },
    );
  }
});
