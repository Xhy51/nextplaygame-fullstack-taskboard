# Release Notes v0.5.3

## Summary

This release continues the Kanban UX polish work with a stronger focus on interaction clarity and board readability.

## Highlights

- Updated task interaction logic so only cross-column moves trigger database updates and the `Task moved` toast
- Improved task-card interaction separation:
  - task title opens details
  - delete action is independent
  - drag behavior is less error-prone
- Reworked task creation flow into a single global `Add Task` action in the board toolbar
- Made `due_date` required with a default of today in both UI and database migration flow
- Switched lane sorting to frontend-only view sorting to avoid unnecessary database writes
- Further refined lane header presentation for clearer separation from task cards
- Cleaned repository metadata by removing unused `.bolt` files

## Included Database Migrations

- `20260406120000_002_add_deleted_tasks_archive.sql`
- `20260406123000_003_make_due_date_required.sql`

## Notes

- Frontend lane sorting is view-only and resets to the default display order after reload
- Deleted tasks are archived in `deleted_tasks` with `deleted_at` and `deleted_by`
