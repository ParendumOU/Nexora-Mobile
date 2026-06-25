import { useCallback, useEffect, useRef, useState } from 'react';
import { api, refreshAccessToken, wsUrlFor, wsProtocolsFor } from './api';
import { useStore } from './store';
import type { ChatMessage, Plan, PlanStep, SubAgentActivity, ToolCall, WsEvent } from './types';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

let idCounter = 0;
const localId = () => `local-${Date.now()}-${idCounter++}`;

interface SendOpts {
  agentId?: string | null;
  mode?: string;
}

export function useChat(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [activity, setActivity] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgentActivity[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const ws = useRef<WebSocket | null>(null);
  const streamingId = useRef<string | null>(null);
  const attempts = useRef(0);
  const closedByUs = useRef(false);
  const needRefresh = useRef(false);
  const stopped = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── history ──
  useEffect(() => {
    let alive = true;
    setLoadingHistory(true);
    api
      .getMessages(chatId)
      .then((hist) => {
        if (alive) setMessages(Array.isArray(hist) ? hist : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoadingHistory(false));
    return () => {
      alive = false;
    };
  }, [chatId]);

  // mutate one sub-agent activity by task id
  const patchSub = useCallback((taskId: string, fn: (a: SubAgentActivity) => SubAgentActivity) => {
    setSubAgents((list) => {
      const idx = list.findIndex((a) => a.taskId === taskId);
      if (idx < 0) return list;
      const copy = [...list];
      copy[idx] = fn(copy[idx]);
      return copy;
    });
  }, []);

  const handleEvent = useCallback(
    (evt: WsEvent) => {
      switch (evt.type) {
        case 'connected':
          attempts.current = 0;
          setStatus('open');
          break;

        case 'stream_start': {
          stopped.current = false;
          const id = localId();
          streamingId.current = id;
          setActivity('typing');
          setMessages((m) => [...m, { id, role: 'assistant', content: '', streaming: true }]);
          break;
        }

        case 'chunk': {
          const id = streamingId.current;
          if (!id || stopped.current) break;
          setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, content: msg.content + evt.content } : msg)));
          break;
        }

        case 'stream_end': {
          const id = streamingId.current;
          streamingId.current = null;
          setActivity(null);
          setTools([]);
          setMessages((m) => {
            // Dedup: if the server message_id is already present (retry), drop the placeholder.
            if (evt.message_id && m.some((x) => x.id === evt.message_id && x.id !== id)) {
              return m.filter((x) => x.id !== id);
            }
            return m.map((msg) =>
              msg.id === id
                ? {
                    ...msg,
                    id: evt.message_id || msg.id,
                    content: evt.content ?? msg.content,
                    streaming: false,
                    metadata: evt.metadata,
                    createdAt: evt.created_at,
                  }
                : msg,
            );
          });
          break;
        }

        case 'user_message': {
          setMessages((m) => {
            if (evt.message_id && m.some((x) => x.id === evt.message_id)) return m;
            const pendingIdx = m.findIndex((x) => x.pending && x.content === evt.content);
            const confirmed: ChatMessage = {
              id: evt.message_id || localId(),
              role: 'user',
              content: evt.content,
              userName: evt.user_name,
              createdAt: evt.created_at,
            };
            if (pendingIdx >= 0) {
              const copy = [...m];
              copy[pendingIdx] = confirmed;
              return copy;
            }
            return [...m, confirmed];
          });
          break;
        }

        case 'tool_call':
          setActivity(`running ${evt.tool}`);
          setTools((t) => [...t, { id: localId(), tool: evt.tool, args: evt.args, status: 'running' }]);
          break;

        case 'activity_status':
          if (evt.status === 'idle') setActivity(null);
          else setActivity(evt.label || evt.tool || (evt.status === 'executing_tool' ? 'running tool' : 'working'));
          break;

        // ── sub-agents ──
        case 'sub_agent_start':
          setSubAgents((list) => {
            if (list.some((a) => a.taskId === evt.task_id)) return list;
            return [
              ...list,
              {
                taskId: evt.task_id,
                agentName: evt.agent_name || 'Sub-agent',
                taskTitle: evt.task_title || '',
                content: '',
                done: false,
                failed: false,
                steps: [],
              },
            ];
          });
          break;
        case 'sub_agent_chunk':
          if (evt.content) patchSub(evt.task_id, (a) => ({ ...a, content: a.content + evt.content }));
          break;
        case 'sub_agent_step_start':
          patchSub(evt.task_id, (a) => ({
            ...a,
            steps: [
              ...a.steps,
              { stepId: evt.step_id, label: evt.step_label || evt.step_name || 'step', status: 'running' },
            ],
          }));
          break;
        case 'sub_agent_step_done':
          patchSub(evt.task_id, (a) => ({
            ...a,
            steps: a.steps.map((s) =>
              s.stepId === evt.step_id
                ? { ...s, status: evt.status === 'success' ? 'success' : 'failed', error: evt.error }
                : s,
            ),
          }));
          break;
        case 'sub_agent_done':
          patchSub(evt.task_id, (a) => ({ ...a, done: true, failed: !!evt.failed }));
          break;

        // ── plan (live) ──
        case 'plan_created':
          setPlan(evt.plan);
          break;
        case 'plan_step_updated':
          setPlan((p) =>
            p
              ? { ...p, steps: p.steps.map((s: PlanStep) => (s.id === evt.step.id ? { ...s, ...evt.step } : s)) }
              : p,
          );
          break;
        case 'plan_completed':
          setPlan((p) => (p ? { ...p, status: 'completed' } : p));
          break;

        case 'error':
          setActivity(null);
          streamingId.current = null;
          // Stale access JWT — flag a refresh; the close handler mints a fresh token
          // before reconnecting. Don't surface it as a user-facing error.
          if (evt.message === 'Unauthorized') {
            needRefresh.current = true;
            break;
          }
          setMessages((m) => [...m, { id: localId(), role: 'system', content: evt.message, error: true }]);
          break;

        case 'busy':
          setMessages((m) => [
            ...m,
            { id: localId(), role: 'system', content: evt.message || 'Sub-agent is still working — please wait.' },
          ]);
          break;

        case 'ping':
          ws.current?.send(JSON.stringify({ type: 'pong' }));
          break;

        // connected presence / chat list refreshes are no-ops on mobile for now:
        // task_created/updated/deleted, chat_title_updated, chat_notes_updated, chat_created
        default:
          break;
      }
    },
    [patchSub],
  );

  const connect = useCallback(() => {
    // Read the session fresh from the store so a token refresh (which patches the
    // store) is picked up on the next reconnect without recreating this callback.
    const s = useStore.getState().session;
    if (!s) return;
    closedByUs.current = false;
    setStatus(attempts.current === 0 ? 'connecting' : 'reconnecting');

    // Connect with the current access token (like the web frontend). We only refresh
    // when the server actually rejects us with "Unauthorized" — refreshing on every
    // connect would burst /auth/device/refresh into a 429 rate-limit.
    // Token goes in the WS subprotocol (#159), not the URL — keeps it out of logs.
    const socket = new WebSocket(
      wsUrlFor(s.serverUrl, chatId),
      wsProtocolsFor(s.accessToken),
    );
    ws.current = socket;

    socket.onopen = () => {
      attempts.current = 0;
    };
    socket.onmessage = (e) => {
      try {
        handleEvent(JSON.parse(e.data as string) as WsEvent);
      } catch {
        /* ignore malformed frame */
      }
    };
    socket.onerror = () => {};
    socket.onclose = () => {
      if (closedByUs.current) {
        setStatus('closed');
        return;
      }
      attempts.current += 1;
      setStatus('reconnecting');
      const delay = Math.min(30000, 500 * 2 ** attempts.current + Math.random() * 400);
      reconnectTimer.current = setTimeout(async () => {
        if (needRefresh.current) {
          needRefresh.current = false;
          try {
            await refreshAccessToken(useStore.getState().session!);
          } catch {
            /* transient — retry on the next cycle with the existing token */
          }
        }
        connect();
      }, delay);
    };
  }, [chatId, handleEvent]);

  useEffect(() => {
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((content: string, opts: SendOpts = {}) => {
    const text = content.trim();
    if (!text) return;
    if (ws.current?.readyState !== WebSocket.OPEN) {
      setMessages((m) => [
        ...m,
        {
          id: localId(),
          role: 'system',
          content: 'Not connected — reconnecting, try again in a moment.',
          error: true,
        },
      ]);
      return;
    }
    setMessages((m) => [...m, { id: localId(), role: 'user', content: text, pending: true }]);
    // Frame matches the web frontend exactly (no agent by default; the platform
    // routes to the default provider/agent).
    const frame = {
      type: 'message',
      content: text,
      agent_id: opts.agentId ?? null,
      provider_chain_id: null,
      mode: opts.mode ?? 'flash',
      model_name: null,
      enable_agent: true,
      file_ids: [] as string[],
      client_message_id: localId(),
    };
    ws.current.send(JSON.stringify(frame));
  }, []);

  // Stop generation: mirror web — set a local guard so late chunks are ignored,
  // freeze the current streamed text as a final message, and tell the backend to cancel.
  const stop = useCallback(async () => {
    stopped.current = true;
    const id = streamingId.current;
    streamingId.current = null;
    setActivity(null);
    if (id) setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg)));
    try {
      await api.cancelChat(chatId);
    } catch {
      /* best-effort */
    }
  }, [chatId]);

  const isStreaming = activity != null || streamingId.current != null;

  return { messages, status, activity, tools, subAgents, plan, loadingHistory, isStreaming, send, stop };
}
