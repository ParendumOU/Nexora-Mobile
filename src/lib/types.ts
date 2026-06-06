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

export interface MessageMeta {
  provider?: string;
  model?: string;
  kind?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
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
  metadata?: MessageMeta;
  // local-only
  streaming?: boolean;
  pending?: boolean;
  error?: boolean;
}

export interface ToolCall {
  id: string;
  tool: string;
  args?: Record<string, unknown>;
  status?: 'running' | 'success' | 'failed';
}

export interface TaskItem {
  id: string;
  title: string;
  status: string;
  agent_name?: string | null;
}

export interface PlanStep {
  id: string;
  title: string;
  status: string;
  order?: number;
}

export interface ChatNote {
  id: string;
  content: string;
  created_at?: string;
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
  | { type: 'activity_status'; status: string }
  | { type: 'sub_agent_start'; task_id: string; agent_name?: string; task_title?: string }
  | { type: 'sub_agent_chunk'; task_id: string; content: string }
  | { type: 'task_created' | 'task_updated' | 'task_deleted'; task?: TaskItem }
  | { type: 'chat_title_updated'; title: string }
  | { type: 'ping' }
  | { type: 'error'; message: string };
