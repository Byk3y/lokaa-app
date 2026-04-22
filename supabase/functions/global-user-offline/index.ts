// global-user-offline — TOMBSTONE (2026-04-22)
//
// Background: the previously deployed v5 accepted `user_id` as a form
// field and updated space_members setting is_online=false for that
// user across ALL their spaces, using a service_role client. No auth
// check — any logged-in user could silently set anyone else offline
// everywhere.
//
// No client code calls this function (verified by grep on src/).
// Tombstoned rather than hardened; if presence functionality comes
// back, redesign with user_id === auth.uid() enforcement.
//
// To fully remove: Supabase Dashboard → Edge Functions →
// global-user-offline → Delete. Tracked in launch checklist.

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
      message: 'global-user-offline has been retired. Presence is now managed client-side.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
