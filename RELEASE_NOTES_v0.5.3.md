# Release Notes v0.5.3

## Summary

This file now acts as a baseline note for the `main` branch release before the larger authenticated collaboration work on `dev`.

## Main Branch Highlights

- Polished Kanban lane presentation and task-card UI
- Safer drag-and-drop interactions
- Global `Add Task` flow
- Due date defaults and soft-delete archive support
- Frontend-only lane sorting

## Dev Branch Since v0.5.3

The `dev` branch currently extends beyond this release with:

- email/password login
- team members and shared organization data
- owner / assignee / participant task roles
- task comments
- activity timeline
- label manager and label assignment
- title, priority, assignee, and label filtering
- board summary stats
- local admin helper script for demo accounts

## Included Database Migrations Since Main Release

- `20260406120000_002_add_deleted_tasks_archive.sql`
- `20260406123000_003_make_due_date_required.sql`
- `20260407001000_004_add_task_comments.sql`
- `20260407002000_005_add_task_activity_logs.sql`
