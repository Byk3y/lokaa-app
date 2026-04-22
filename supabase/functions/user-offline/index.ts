// user-offline — TOMBSTONE (2026-04-22)
//
// Background: the previously deployed v5 accepted `space_id` and
// `user_id` as form fields and called set_user_offline_safe(...) with
// a service_role client. No auth check — any logged-in user could
// mark any other user offline in any space (presence griefing).
//
// No client code calls this function (verified by grep on src/ for
// both the function name and the RPC `set_user_offline_safe`). We
// tombstone rather than harden since it's orphaned; if presence
// functionality comes back later, redesign with user_id === auth.uid()
// enforcement and a typed request body (not formData).
//
// To fully remove: Supabase Dashboard → Edge Functions →
// user-offline → Delete. Tracked in launch checklist.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: 'gone',
      message: 'user-offline has been retired. Presence is now managed client-side.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
