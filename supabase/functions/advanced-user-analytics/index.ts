// advanced-user-analytics — TOMBSTONE (2026-04-22)
//
// Background: the previously deployed v5 of this function accepted a
// `user_id` in the request body and queried posts, chat_messages,
// post_comments, etc. for ANY passed user_id using a service_role
// client. It had no auth check beyond the platform verify_jwt gate —
// any logged-in Lokaa user could call it with someone else's id and
// read their engagement data. That's a data leak.
//
// No client code calls this function (verified by grep on src/). We
// could harden it, but since it's orphaned the cheaper and safer move
// is to tombstone: return 410 Gone for every request. If a hidden
// caller surfaces, the 410 will tell them clearly.
//
// To fully remove: delete via the Supabase Dashboard → Edge Functions
// → advanced-user-analytics → Delete. Tracked in launch checklist.
//
// If the feature comes back, redesign with per-action auth:
//   - user_engagement: require user_id === auth.uid()
//   - space_analytics: require caller is owner/admin of the space
//   - growth_metrics: admin-only (platform staff role)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: 'gone',
      message: 'advanced-user-analytics has been retired. Contact support if you depended on this endpoint.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
