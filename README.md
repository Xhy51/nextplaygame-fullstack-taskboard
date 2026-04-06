# Next.js Kanban Board

A polished Kanban-style task board built with Next.js 13, React 18, TypeScript, Tailwind CSS, and Supabase.

It supports anonymous guest sessions, drag-and-drop task movement, real-time task updates, and a more visual card-based board UI.

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-wkzqtf7k)

## Features

- Four built-in workflow lanes: `To Do`, `In Progress`, `In Review`, `Done`
- Drag-and-drop task movement with live lane highlighting
- Overlay drag preview that follows the cursor
- Insert-position indicator when dropping between cards
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

Create `/.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the database migration

Open Supabase `SQL Editor` and run:

```sql
-- Paste the contents of:
-- supabase/migrations/20260405224118_001_create_kanban_schema.sql
```

Migration file:
[20260405224118_001_create_kanban_schema.sql](./supabase/migrations/20260405224118_001_create_kanban_schema.sql)

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

### Realtime

- The board subscribes to task `INSERT`, `UPDATE`, and `DELETE` events
- Other open sessions connected to the same board receive live task changes

## Supabase Notes

This project depends on Supabase from the first render. If Supabase is not configured correctly, the board will not load.

Common setup issues:

- `Failed to initialize session`
  Usually means anonymous auth is not enabled or env vars are incorrect.

- `Failed to load board`
  Usually means the SQL migration was not applied correctly, or RLS policies need to be updated.

- Realtime not updating
  Usually means `public.tasks` is not included in the `supabase_realtime` publication.

## Current Limitations

- Attachments currently use mock object URLs instead of Supabase Storage
- Team collaboration schema exists, but the current flow is optimized for single-user guest demos
- No automated tests are included yet

## Recommended Next Steps

- Add Supabase Storage for real file uploads
- Add board sharing and team-member flows
- Add filtering, search, and task sorting controls
- Add automated tests for board initialization and drag-drop behavior
- Add a deployment guide for Vercel or Netlify

## License

This project is provided as-is for learning, prototyping, and further extension.
