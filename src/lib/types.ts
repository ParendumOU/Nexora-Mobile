// Shapes mirrored from the Nexora core API.

export interface Session {
  serverUrl: string; // e.g. https://nexora.mycompany.local
  deviceToken: string; // nxd_... long-lived secret
  accessToken: string; // short-lived JWT
  deviceId: string;
  orgId: string | null;
  userName: string;
  userEmail: string;
}

export interface Agent {
  id: string;
  name: string;
  agent_type: string;
  description?: string | null;
  soul?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ChatStats {
  subchat_count?: number;
  tool_calls?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface Chat {
  id: string;
  title: string;
  agent_id?: string | null;
  agent_name?: string | null;
  provider_chain_id?: string | null;
  project_id?: string | null;
  is_archived?: boolean;
  stats?: ChatStats;
  updated_at?: string;
  created_at?: string;
  last_message_preview?: string | null;
}

export type Role = 'user' | 'assistant' | 'system';

export type MessageKind =
  | 'task_brief'
  | 'task_error'
  | 'tool_result_injection'
  | 'nudge'
  | 'child_task_injection'
  | null;

export interface MessageMeta {
  provider?: string;
  model?: string;
  kind?: MessageKind;
  usage?: { input_tokens?: number; output_tokens?: number; cached_input_tokens?: number };
  cost_usd?: number;
  duration_ms?: number;
  agentName?: string | null;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt?: string;
  agentName?: string | null;
  userName?: string | null;
  userId?: string | null;
  excluded?: boolean;
  metadata?: MessageMeta;
  // local-only
  streaming?: boolean;
  pending?: boolean;
  error?: boolean;
}

// Raw shape returned by GET /chats/{id}/messages (snake_case + metadata_).
export interface RawMessage {
  id: string;
  role: string;
  content: string;
  metadata_?: Record<string, unknown>;
  provider_used?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  excluded?: boolean;
  created_at?: string;
}

export interface ToolCall {
  id: string;
  tool: string;
  args?: Record<string, unknown>;
  status?: 'running' | 'success' | 'failed';
}

export interface TaskItem {
  id: string;
  chat_id?: string;
  parent_id?: string | null;
  title: string;
  status: string; // pending | running | queued | completed | failed | paused
  assigned_agent_name?: string | null;
  sub_chat_id?: string | null;
  created_at?: string;
}

export interface PlanStep {
  id: string;
  title: string;
  status: string; // pending | in_progress | done | failed | skipped
  position?: number;
  note?: string | null;
}

export interface Plan {
  id: string;
  chat_id: string;
  title: string;
  status: string; // active | completed | cancelled
  steps: PlanStep[];
}

export interface ChatNote {
  id: string;
  content: string;
  description?: string | null;
  author?: string | null;
  created_at?: string;
}

export interface NotesResponse {
  chat_id: string;
  notes: ChatNote[];
  total: number;
  page: number;
  page_size: number;
}

export interface HierarchyChat {
  id: string;
  title: string;
  agent_name?: string | null;
  depth: number;
  parent_id?: string | null;
  status: string; // running | completed | failed | stalled | awaiting_input
  task_counts?: Record<string, number>;
  message_count?: number;
}

export interface Hierarchy {
  root_id: string;
  current_chat_id: string;
  chats_by_depth: HierarchyChat[];
}

// ── WebSocket server → client events ──────────────────────────────────────────
export type WsEvent =
  | { type: 'connected'; chat_id?: string; participants?: { id: string; name: string }[] }
  | { type: 'stream_start' }
  | { type: 'chunk'; content: string }
  | {
      type: 'stream_end';
      message_id: string;
      content: string;
      metadata?: MessageMeta;
      created_at?: string;
    }
  | {
      type: 'user_message';
      message_id: string;
      content: string;
      user_id?: string;
      user_name?: string;
      created_at?: string;
    }
  | { type: 'tool_call'; tool: string; args?: Record<string, unknown> }
  | { type: 'activity_status'; status: string; label?: string; tool?: string }
  | { type: 'sub_agent_start'; task_id: string; agent_name?: string; task_title?: string; sub_chat_id?: string }
  | { type: 'sub_agent_chunk'; task_id: string; content?: string }
  | { type: 'sub_agent_step_start'; task_id: string; step_id: string; step_name?: string; step_label?: string }
  | { type: 'sub_agent_step_done'; task_id: string; step_id: string; status: string; error?: string }
  | { type: 'sub_agent_done'; task_id: string; failed?: boolean; output?: string }
  | { type: 'task_created' | 'task_updated'; task?: TaskItem }
  | { type: 'task_deleted'; task_id?: string }
  | { type: 'plan_created'; plan: Plan }
  | { type: 'plan_step_updated'; step: PlanStep }
  | { type: 'plan_completed' }
  | { type: 'chat_title_updated'; title: string }
  | { type: 'chat_notes_updated' }
  | { type: 'chat_created' }
  | { type: 'ping' }
  | { type: 'busy'; message?: string }
  | { type: 'error'; message: string };

export interface SubAgentStep {
  stepId: string;
  label: string;
  status: 'running' | 'success' | 'failed';
  error?: string;
}

export interface SubAgentActivity {
  taskId: string;
  agentName: string;
  taskTitle: string;
  content: string;
  done: boolean;
  failed: boolean;
  steps: SubAgentStep[];
}
