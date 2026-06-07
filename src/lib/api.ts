import { useStore } from './store';
import type { Agent, Chat, ChatMessage, ChatNote, PlanStep, Session, TaskItem } from './types';

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

export function wsUrlFor(serverUrl: string, chatId: string, token: string): string {
  const ws = serverUrl.replace(/^http/i, 'ws');
  return `${ws}/ws/chat/${chatId}?token=${encodeURIComponent(token)}`;
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
  getMessages: (id: string) => request<ChatMessage[]>(`/chats/${id}/messages`),

  // agents
  listAgents: () => request<Agent[]>('/agents'),

  // in-chat panels
  getTasks: (chatId: string) => request<TaskItem[]>(`/tasks?chat_id=${chatId}`),
  getPlan: (chatId: string) => request<{ steps: PlanStep[] } | PlanStep[]>(`/plans?chat_id=${chatId}`),
  getNotes: (chatId: string) => request<ChatNote[]>(`/chats/${chatId}/notes`),

  // devices (self-management)
  listDevices: () => request<{ id: string; name: string; platform: string }[]>('/auth/device'),
  revokeDevice: (id: string) => request<void>(`/auth/device/${id}`, { method: 'DELETE' }),

  raw: request,
};
