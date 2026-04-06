# Next.js Kanban Board

A polished Kanban-style task board built with Next.js 13, React 18, TypeScript, Tailwind CSS, and Supabase.

It supports anonymous guest sessions, drag-and-drop task movement, real-time task updates, and a more visual card-based board UI.

Current release: `v0.5.2`

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-wkzqtf7k)

## Preview

### Screenshot

Add a project screenshot here after uploading an image to the repository, for example:

```md
![Kanban board screenshot](./docs/screenshot-kanban-board.png)
```

### Demo GIF

Add a short drag-and-drop demo GIF here after uploading it to the repository, for example:

```md
![Kanban board demo](./docs/kanban-demo.gif)
```

## Features

- Four built-in workflow lanes: `To Do`, `In Progress`, `In Review`, `Done`
- Drag-and-drop task movement with lane highlighting and insert indicators
- Overlay drag preview that follows the cursor
- Header toolbar with a single global `Add Task` action
- Status-selectable task creation flow with default `To Do`
- Only task titles open detail view; delete and drag interactions are isolated
- Frontend-only lane sorting by due date or priority without extra database writes
- Required due dates with a default value of today
- Soft delete flow that archives deleted tasks with `deleted_at` and `deleted_by`
- Anonymous guest authentication with Supabase Auth
- Real-time task sync through Supabase Realtime
- Task create, update, delete, and detail modal
- Due dates, priority badges, labels, and mock attachments
- Refined UI with lane headers, card depth, and improved visual hierarchy

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
components/kanban/           Kanban board UI and interactions
components/ui/               Shared UI primitives
hooks/                       Shared hooks
lib/                         Supabase client, types, and queries
supabase/migrations/         SQL schema and policies
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a new project in the Supabase dashboard.

### 3. Add environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then update the values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the database migrations

Open Supabase `SQL Editor` and run:

```sql
-- Run these files in order:
-- supabase/migrations/20260405224118_001_create_kanban_schema.sql
-- supabase/migrations/20260406120000_002_add_deleted_tasks_archive.sql
-- supabase/migrations/20260406123000_003_make_due_date_required.sql
```

Migration files:
[20260405224118_001_create_kanban_schema.sql](./supabase/migrations/20260405224118_001_create_kanban_schema.sql)
[20260406120000_002_add_deleted_tasks_archive.sql](./supabase/migrations/20260406120000_002_add_deleted_tasks_archive.sql)
[20260406123000_003_make_due_date_required.sql](./supabase/migrations/20260406123000_003_make_due_date_required.sql)

### 5. Enable anonymous auth

In Supabase Dashboard:

`Authentication` -> `Providers` -> `Anonymous` -> enable and save

### 6. Enable realtime for tasks

This project subscribes to task changes in realtime. In Supabase, add `public.tasks` to the `supabase_realtime` publication.

You can do that in SQL Editor with:

```sql
alter publication supabase_realtime add table public.tasks;
```

### 7. Start the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## How It Works

### Authentication

- The app initializes a guest session on load
- Supabase `signInAnonymously()` creates a session automatically
- The signed-in guest gets a personal board on first use

### Board Initialization

- On first load, the app creates a board for the current user
- It also creates the four default columns if they do not exist

### Drag and Drop

- Tasks are draggable via `@dnd-kit`
- A floating drag overlay follows the pointer
- The target lane highlights as you move across the board
- A drop indicator line shows the insertion position inside a lane
- Clicking the task title opens details
- Clicking the delete action archives the task instead of hard-deleting it

### Realtime

- The board subscribes to task `INSERT`, `UPDATE`, and `DELETE` events
- Other open sessions connected to the same board receive live task changes

### Sorting

- Each lane can be temporarily sorted by due date or priority
- Sorting is handled in the frontend view layer
- Sort actions do not rewrite task order in the database
- Default lane display order is by nearest due date first

## Supabase Notes

This project depends on Supabase from the first render. If Supabase is not configured correctly, the board will not load.

Common setup issues:

- `Failed to initialize session`
  Usually means anonymous auth is not enabled or env vars are incorrect.

- `Failed to load board`
  Usually means the SQL migration was not applied correctly, or RLS policies need to be updated.

- Realtime not updating
  Usually means `public.tasks` is not included in the `supabase_realtime` publication.

- Task deletion not working as expected
  Make sure the archived-task migration has been applied so `deleted_tasks` exists.

## Current Limitations

- Attachments currently use mock object URLs instead of Supabase Storage
- Team collaboration schema exists, but the current flow is optimized for single-user guest demos
- No automated tests are included yet
- Lane sorting is currently view-only and resets to the default order after reload

## Assets for README

If you want the GitHub page to look more complete, add a `docs/` folder and place assets such as:

- `docs/screenshot-kanban-board.png`
- `docs/kanban-demo.gif`

## Recommended Next Steps

- Add Supabase Storage for real file uploads
- Add board sharing and team-member flows
- Add deleted-task list and restore flow
- Add filtering, search, and saved sort preferences
- Add automated tests for board initialization and drag-drop behavior
- Add a deployment guide for Vercel or Netlify

## License

This project is provided as-is for learning, prototyping, and further extension.
