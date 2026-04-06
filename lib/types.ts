export type Priority = 'low' | 'normal' | 'high';
export type Status = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TeamRole = 'owner' | 'member';

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
  assignee_id?: string;
  user_id: string;
  labels: string[];
  order: number;
  created_at: string;
  updated_at: string;
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
