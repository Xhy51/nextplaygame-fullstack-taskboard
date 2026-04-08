export type Priority = 'low' | 'normal' | 'high';
export type Status = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TeamRole = 'owner' | 'member';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  profile?: Profile;
}

export interface TaskParticipant {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: Profile;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  actor_user_id: string;
  action_type: string;
  message: string;
  metadata?: Record<string, string | string[] | null>;
  created_at: string;
  actor?: Profile;
}

export interface Board {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  order: number;
  created_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  due_date?: string;
  owner_id?: string;
  assignee_id?: string;
  user_id: string;
  labels: string[];
  order: number;
  created_at: string;
  updated_at: string;
  owner?: Profile | null;
  assignee?: Profile | null;
  participants?: TaskParticipant[];
}

export interface DeletedTask {
  id: string;
  original_task_id: string;
  board_id: string;
  column_id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  due_date?: string;
  assignee_id?: string;
  user_id: string;
  labels: string[];
  order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  deleted_by: string;
}

export interface Label {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  uploaded_at: string;
}

export interface TeamMember {
  id: string;
  board_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
}

export interface User {
  id: string;
  email?: string;
}
