/*
  # Make task due_date required with default current date

  1. Backfill
    - Fill existing NULL due_date values with current_date

  2. Schema changes
    - Set default due_date to current_date
    - Mark due_date as NOT NULL
*/

UPDATE tasks
SET due_date = CURRENT_DATE
WHERE due_date IS NULL;

ALTER TABLE tasks
ALTER COLUMN due_date SET DEFAULT CURRENT_DATE;

ALTER TABLE tasks
ALTER COLUMN due_date SET NOT NULL;
