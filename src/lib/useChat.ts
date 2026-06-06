import { useCallback, useEffect, useRef, useState } from 'react';
import { api, wsUrlFor } from './api';
import { useStore } from './store';
import type { ChatMessage, ToolCall, WsEvent } from './types';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

let idCounter = 0;
const localId = () => `local-${Date.now()}-${idCounter++}`;

interface SendOpts {
  agentId?: string | null;
  mode?: string;
}

export function useChat(chatId: string) {
  const session = useStore((s) => s.session);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [activity, setActivity] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const ws = useRef<WebSocket | null>(null);
  const streamingId = useRef<string | null>(null);
  const attempts = useRef(0);
  const closedByUs = useRef(false);
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

  const handleEvent = useCallback((evt: WsEvent) => {
    switch (evt.type) {
      case 'connected':
        attempts.current = 0;
        setStatus('open');
        break;
      case 'stream_start': {
        const id = localId();
        streamingId.current = id;
        setActivity('typing');
        setMessages((m) => [
          ...m,
          { id, role: 'assistant', content: '', streaming: true },
        ]);
        break;
      }
      case 'chunk': {
        const id = streamingId.current;
        if (!id) break;
        setMessages((m) =>
          m.map((msg) => (msg.id === id ? { ...msg, content: msg.content + evt.content } : msg)),
        );
        break;
      }
      case 'stream_end': {
        const id = streamingId.current;
        streamingId.current = null;
        setActivity(null);
        setTools([]);
        setMessages((m) =>
          m.map((msg) =>
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
          ),
        );
        break;
      }
      case 'user_message': {
        // Echo from another participant (or our own confirmed message).
        setMessages((m) => {
          if (m.some((x) => x.id === evt.message_id)) return m;
          // Replace an optimistic pending message with same content if present.
          const pendingIdx = m.findIndex((x) => x.pending && x.content === evt.content);
          const confirmed: ChatMessage = {
            id: evt.message_id,
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
        setActivity(evt.status === 'idle' ? null : evt.status);
        break;
      case 'error':
        setActivity(null);
        streamingId.current = null;
        setMessages((m) => [
          ...m,
          { id: localId(), role: 'system', content: evt.message, error: true },
        ]);
        break;
      case 'ping':
        ws.current?.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        break;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!session) return;
    closedByUs.current = false;
    setStatus(attempts.current === 0 ? 'connecting' : 'reconnecting');

    // Ensure a fresh-ish access token (cheap; refresh is server-validated).
    const token = session.accessToken;
    const socket = new WebSocket(wsUrlFor(session.serverUrl, chatId, token));
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
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [session, chatId, handleEvent]);

  useEffect(() => {
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (content: string, opts: SendOpts = {}) => {
      const text = content.trim();
      if (!text) return;
      setMessages((m) => [
        ...m,
        { id: localId(), role: 'user', content: text, pending: true },
      ]);
      const frame = {
        type: 'message',
        content: text,
        agent_id: opts.agentId ?? null,
        mode: opts.mode ?? 'flash',
        enable_agent: true,
        client_message_id: localId(),
      };
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(frame));
      }
    },
    [],
  );

  return { messages, status, activity, tools, loadingHistory, send };
}
