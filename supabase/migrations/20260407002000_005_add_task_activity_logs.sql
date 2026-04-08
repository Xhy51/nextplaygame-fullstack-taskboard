create table if not exists public.task_activity_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_activity_logs_task_id on public.task_activity_logs(task_id);
create index if not exists idx_task_activity_logs_created_at on public.task_activity_logs(created_at desc);

alter table public.task_activity_logs enable row level security;

drop policy if exists "Demo authenticated users can view task activity logs" on public.task_activity_logs;
drop policy if exists "Demo authenticated users can insert task activity logs" on public.task_activity_logs;

create policy "Demo authenticated users can view task activity logs"
on public.task_activity_logs
for select
to authenticated
using (true);

create policy "Demo authenticated users can insert task activity logs"
on public.task_activity_logs
for insert
to authenticated
with check (true);
