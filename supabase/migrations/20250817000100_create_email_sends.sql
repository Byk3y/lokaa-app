-- Create a small table to track idempotent email sends (welcome, etc.)
create table if not exists public.email_sends (
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  primary key (user_id, type)
);

-- RLS not required; edge functions use service role for writes
alter table public.email_sends enable row level security;
-- Allow authenticated users to read their own rows if needed (optional)
create policy if not exists email_sends_read_own
  on public.email_sends for select
  to authenticated
  using (auth.uid() = user_id);

