/*
  # Create Kanban Board Database Schema

  1. New Tables
    - `boards` - Workspace/project level
      - `id` (uuid, primary key)
      - `name` (text)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `columns` - Board sections (To Do, In Progress, In Review, Done)
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `name` (text)
      - `order` (integer, determines column position)
      - `created_at` (timestamp)
    
    - `labels` - Task tags/categories
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `name` (text)
      - `color` (text, hex color code)
      - `created_at` (timestamp)
    
    - `tasks` - Individual task items
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `column_id` (uuid, references columns)
      - `title` (text, required)
      - `description` (text)
      - `status` (text: todo, in_progress, in_review, done)
      - `priority` (text: low, normal, high)
      - `due_date` (date)
      - `assignee_id` (uuid, references auth.users)
      - `user_id` (uuid, references auth.users - task creator)
      - `labels` (jsonb array of label ids)
      - `order` (integer, determines position in column)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `task_attachments` - File storage references
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `file_url` (text)
      - `file_name` (text)
      - `file_size` (integer)
      - `uploaded_at` (timestamp)
    
    - `team_members` - Board collaboration
      - `id` (uuid, primary key)
      - `board_id` (uuid, references boards)
      - `user_id` (uuid, references auth.users)
      - `role` (text: owner, member)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can only view/edit their own boards and tasks
    - Team members can collaborate on shared boards
    - Row-level policies enforce data isolation

  3. Indexes
    - Index on boards(user_id) for fast user board lookup
    - Index on tasks(board_id, column_id) for board column queries
    - Index on tasks(user_id) for user task lookup
    - Index on team_members(board_id, user_id) for collaboration checks
*/

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Board',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create columns table
CREATE TABLE IF NOT EXISTS columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority text NOT NULL CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal',
  due_date date,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  labels jsonb DEFAULT '[]',
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boards
CREATE POLICY "Users can view their own boards"
  ON boards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create boards"
  ON boards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Board owners can update boards"
  ON boards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Board owners can delete boards"
  ON boards FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for columns
CREATE POLICY "Users can view board columns"
  ON columns FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = columns.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Board members can insert columns"
  ON columns FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = columns.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Board members can update columns"
  ON columns FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = columns.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = columns.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

-- RLS Policies for labels
CREATE POLICY "Users can view board labels"
  ON labels FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = labels.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Board members can insert labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = labels.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Board members can update labels"
  ON labels FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = labels.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = labels.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their boards"
  ON tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = tasks.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = tasks.board_id
    AND (boards.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.board_id = boards.id 
      AND team_members.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Users can update their tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = tasks.board_id
    AND boards.user_id = auth.uid()
  ))
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = tasks.board_id
    AND boards.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments for their tasks"
  ON task_attachments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_attachments.task_id
    AND (tasks.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = tasks.board_id
      AND (boards.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.board_id = boards.id 
        AND team_members.user_id = auth.uid()
      ))
    ))
  ));

CREATE POLICY "Users can upload attachments"
  ON task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their attachments"
  ON task_attachments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.user_id = auth.uid()
  ));

-- RLS Policies for team_members
--CREATE POLICY "Users can view team members"
  --ON team_members FOR SELECT
  --TO authenticated
  --USING (
    --user_id = auth.uid()
    --OR EXISTS (
      --SELECT 1 FROM boards
      --WHERE boards.id = team_members.board_id
      --AND boards.user_id = auth.uid()
    --)
  --);

create policy "Users can view team members"
  on public.team_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.boards
      where boards.id = team_members.board_id
      and boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can manage team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = team_members.board_id
    AND boards.user_id = auth.uid()
  ));

CREATE POLICY "Board owners can remove team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = team_members.board_id
    AND boards.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON labels(board_id);
CREATE INDEX IF NOT EXISTS idx_team_members_board_id ON team_members(board_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
