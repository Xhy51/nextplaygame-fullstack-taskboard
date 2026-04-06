/*
  # Add deleted task archive

  1. New table
    - `deleted_tasks`
      - Stores archived task snapshots after deletion
      - Keeps original task metadata plus deletion audit fields

  2. Security
    - Enable RLS
    - Allow users to insert and view only deleted tasks related to boards they own
      or tasks they originally created
*/

CREATE TABLE IF NOT EXISTS deleted_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_task_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority text NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  due_date date,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  labels jsonb DEFAULT '[]',
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE deleted_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view archived tasks"
  ON deleted_tasks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR deleted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = deleted_tasks.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can archive tasks"
  ON deleted_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    deleted_by = auth.uid()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = deleted_tasks.board_id
        AND boards.user_id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_deleted_tasks_board_id ON deleted_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_deleted_tasks_deleted_at ON deleted_tasks(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_tasks_deleted_by ON deleted_tasks(deleted_by);
