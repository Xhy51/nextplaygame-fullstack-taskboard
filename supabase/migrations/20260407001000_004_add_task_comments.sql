create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_comments_task_id on public.task_comments(task_id);
create index if not exists idx_task_comments_created_at on public.task_comments(created_at asc);

alter table public.task_comments enable row level security;

drop policy if exists "Demo authenticated users can view task comments" on public.task_comments;
drop policy if exists "Demo authenticated users can insert task comments" on public.task_comments;

create policy "Demo authenticated users can view task comments"
on public.task_comments
for select
to authenticated
using (true);

create policy "Demo authenticated users can insert task comments"
on public.task_comments
for insert
to authenticated
with check (true);
