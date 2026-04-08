# Next.js Kanban Board

A collaborative Kanban board built with Next.js, TypeScript, Tailwind CSS, and Supabase.

This `dev` branch is focused on an authenticated multi-user demo flow:
- email/password login with demo accounts
- shared organization members
- owner / assignee / participant task roles
- task comments and activity timeline
- labels, search, and board-level filtering
- compact board summary stats

## Current Branch Status

- Stable demo branch: `dev`
- Base release tag on `main`: `v0.5.3`

## Preview

### Screenshot

Add a project screenshot after uploading an image to the repository, for example:

```md
![Kanban board screenshot](./docs/screenshot-kanban-board.png)
```

### Demo GIF

Add a short demo GIF after uploading it to the repository, for example:

```md
![Kanban board demo](./docs/kanban-demo.gif)
```

## Features

### Authentication & Team

- Supabase email/password login
- Demo accounts for `alice`, `bob`, and `carol`
- Team member strip in the board header
- Task visibility constrained in the UI to owner / assignee / participant relevance

### Task Management

- Four workflow lanes: `To Do`, `In Progress`, `In Review`, `Done`
- Drag-and-drop task movement with lane highlighting and insertion indicators
- Global `Add Task` flow with status selection
- Owner, assignee, and participant support
- Required due date with default value set to today
- Soft delete with archive history

### Task Detail

- Editable title, description, priority, due date
- Editable assignee and participants
- Label assignment
- Comments with timestamps
- Activity timeline for task changes
- Mock attachment uploads

### Discovery & Filtering

- Title search
- Priority filter
- Assignee filter
- Label filter
- Summary stats for total, completed, overdue, assigned to me, and participating

## Tech Stack

- Next.js 13
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- `@dnd-kit`
- Supabase
- Sonner
- React Hook Form
- date-fns

## Project Structure

```text
app/                         Next.js App Router entrypoints
components/auth/             Login page and auth UI
components/kanban/           Board, task detail, filters, comments, activity
components/team/             Team avatars and people UI
components/ui/               Shared UI primitives
lib/                         Supabase client, queries, and shared types
scripts/                     Local-only admin helper scripts
supabase/migrations/         SQL schema and policy files
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Supabase migrations

Execute these files in Supabase SQL Editor in order:

- [20260405224118_001_create_kanban_schema.sql](./supabase/migrations/20260405224118_001_create_kanban_schema.sql)
- [20260406120000_002_add_deleted_tasks_archive.sql](./supabase/migrations/20260406120000_002_add_deleted_tasks_archive.sql)
- [20260406123000_003_make_due_date_required.sql](./supabase/migrations/20260406123000_003_make_due_date_required.sql)
- [20260407001000_004_add_task_comments.sql](./supabase/migrations/20260407001000_004_add_task_comments.sql)
- [20260407002000_005_add_task_activity_logs.sql](./supabase/migrations/20260407002000_005_add_task_activity_logs.sql)

### 4. Start the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Demo Accounts

Use the login page shortcuts or sign in with:

- `alice@example.com` / `Alice@2026!`
- `bob@example.com` / `Bob@2026!`
- `carol@example.com` / `Carol@2026!`

## Local Admin Script

The repository includes a local-only helper script to update demo account passwords and confirm their email state:

- [update-demo-auth-users.mjs](./scripts/update-demo-auth-users.mjs)

Create a local env file first:

```bash
cp .env.admin.local.example .env.admin.local
```

Then set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run:

```bash
npm run admin:update-demo-users
```

Notes:
- `.env.local` and `.env.admin.local` are ignored by Git
- the script is intended to be committed
- secrets must stay only in local env files

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run admin:update-demo-users
```

## Deploying To Vercel

This project is now prepared primarily for Vercel deployment.

### Recommended setup

1. Import the GitHub repository into Vercel
2. Set the Production Branch to the branch you want to deploy, such as `dev`
3. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Run the Supabase migrations in the target Supabase project before first deploy

### Notes

- No `vercel.json` is required for the current setup
- Netlify-specific config has been removed to reduce deployment confusion
- If you later want to deploy from `main`, merge the `dev` branch work first

## Current Limitations

- RLS is intentionally relaxed in parts of the demo flow; some user visibility is enforced in the frontend for development speed
- Attachments still use mock object URLs instead of Supabase Storage
- No automated tests are included yet
- Search and filtering are board-level UI filters only; they are not persisted

## Release Notes

- [RELEASE_NOTES_v0.5.3.md](./RELEASE_NOTES_v0.5.3.md)

## License

This project is provided as-is for learning, prototyping, and extension.
