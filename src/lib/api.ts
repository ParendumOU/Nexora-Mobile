import { useStore } from './store';
import type {
  Agent,
  Chat,
  ChatMessage,
  Hierarchy,
  MessageMeta,
  NotesResponse,
  Plan,
  RawMessage,
  Role,
  Session,
  TaskItem,
} from './types';

// Map a raw API message → ChatMessage, mirroring the web frontend:
// role is "assistant" when it has an agent (agent_id/agent_name), else "user";
// metadata comes from metadata_.
export function normalizeMessage(m: RawMessage): ChatMessage {
  const isAgent = !!m.agent_id || m.role === 'assistant' || !!m.agent_name;
  const meta = (m.metadata_ || {}) as MessageMeta & { tg_user_display?: string };
  return {
    id: m.id,
    role: (isAgent ? 'assistant' : m.role === 'system' ? 'system' : 'user') as Role,
    content: m.content,
    createdAt: m.created_at,
    agentName: isAgent ? m.agent_name ?? null : null,
    userName: meta.tg_user_display || m.user_name || null,
    userId: m.user_id ?? null,
    excluded: m.excluded,
    metadata: m.metadata_ ? meta : undefined,
  };
}

// Web's display filter: drop empty messages and system-injected ones
// (tool results / nudges / watchdog) which are excluded=true with no user_id.
function isDisplayable(m: ChatMessage): boolean {
  if (!m.content || !m.content.trim().length) return false;
  if (m.excluded && !m.userId) return false;
  return true;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Normalize a user-entered server URL: trim, default to https, strip trailing slash + /api. */
export function normalizeServerUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/api$/i, '');
  return url;
}

// Auth subprotocol scheme — must match backend WS_AUTH_SUBPROTOCOL (core #159).
export const WS_AUTH_SUBPROTOCOL = 'nexora-bearer';

// Returns the bare ws(s) URL — the token is passed as a WebSocket subprotocol
// (see wsProtocolsFor) instead of a ?token= query param, so it never lands in
// server/proxy access logs (#159).
export function wsUrlFor(serverUrl: string, chatId: string, _token?: string): string {
  const ws = serverUrl.replace(/^http/i, 'ws');
  return `${ws}/ws/chat/${chatId}`;
}

// Subprotocols array to pass as `new WebSocket(url, protocols)`: [scheme, token].
export function wsProtocolsFor(token: string): string[] {
  return token ? [WS_AUTH_SUBPROTOCOL, token] : [];
}

// ── Pairing (no auth) ─────────────────────────────────────────────────────────

export interface PairResult {
  access_token: string;
  device_token: string;
  device_id: string;
  org_id: string | null;
  user_name: string;
  user_email: string;
}

export async function pairDevice(
  serverUrl: string,
  code: string,
  deviceName: string,
  platform: string,
): Promise<Session> {
  const res = await fetch(`${serverUrl}/api/auth/device/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, device_name: deviceName, platform }),
  });
  if (!res.ok) {
    const detail = await safeDetail(res);
    throw new ApiError(res.status, detail || 'Pairing failed');
  }
  const data = (await res.json()) as PairResult;
  return {
    serverUrl,
    deviceToken: data.device_token,
    accessToken: data.access_token,
    deviceId: data.device_id,
    orgId: data.org_id,
    userName: data.user_name,
    userEmail: data.user_email,
  };
}

export async function refreshAccessToken(session: Session): Promise<string> {
  const res = await fetch(`${session.serverUrl}/api/auth/device/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_token: session.deviceToken }),
  });
  if (!res.ok) throw new ApiError(res.status, 'Device session expired');
  const data = (await res.json()) as { access_token: string };
  await useStore.getState().patchAccessToken(data.access_token);
  return data.access_token;
}

async function safeDetail(res: Response): Promise<string | null> {
  try {
    const body = await res.json();
    return typeof body?.detail === 'string' ? body.detail : null;
  } catch {
    return null;
  }
}

// ── Authenticated request core (auto device-refresh on 401) ───────────────────

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = useStore.getState().session;
  if (!session) throw new ApiError(401, 'Not linked');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${session.serverUrl}/api${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    try {
      await refreshAccessToken(session);
    } catch (e) {
      // Only force a re-link when the device token itself is rejected (401).
      // Transient failures (429 rate-limit, 5xx, network) must NOT sign the user out.
      if (e instanceof ApiError && e.status === 401) {
        await useStore.getState().signOut();
        throw new ApiError(401, 'Session expired — please re-link this device');
      }
      throw new ApiError(503, 'Could not refresh session — try again in a moment');
    }
    return request<T>(path, init, false);
  }

  if (!res.ok) {
    const detail = await safeDetail(res);
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  // chats (trailing slash matches the backend routes — avoids a 307 redirect)
  listChats: () => request<Chat[]>('/chats/'),
  getChat: (id: string) => request<Chat>(`/chats/${id}`),
  createChat: (body: { title?: string; agent_id?: string | null }) =>
    request<Chat>('/chats/', { method: 'POST', body: JSON.stringify(body) }),
  archiveChat: (id: string) => request<void>(`/chats/${id}`, { method: 'DELETE' }),
  getMessages: async (id: string): Promise<ChatMessage[]> => {
    const raw = await request<RawMessage[]>(`/chats/${id}/messages`);
    return (raw || []).map(normalizeMessage).filter(isDisplayable);
  },

  cancelChat: (id: string) => request<void>(`/chats/${id}/cancel_all`, { method: 'POST' }),

  // agents
  listAgents: () => request<Agent[]>('/agents'),

  // in-chat panels (endpoints + shapes verified against the web frontend)
  getTasks: (chatId: string) => request<TaskItem[]>(`/tasks?chat_id=${chatId}`),
  getPlans: (chatId: string) => request<Plan[]>(`/plans?chat_id=${chatId}`),
  getNotes: (chatId: string) => request<NotesResponse>(`/chats/${chatId}/notes?page=1&page_size=50`),
  getHierarchy: (chatId: string) => request<Hierarchy>(`/chats/${chatId}/hierarchy`),

  // devices (self-management)
  listDevices: () => request<{ id: string; name: string; platform: string }[]>('/auth/device'),
  revokeDevice: (id: string) => request<void>(`/auth/device/${id}`, { method: 'DELETE' }),

  raw: request,
};
