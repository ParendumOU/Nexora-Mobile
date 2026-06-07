import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { ChatMessage } from '@/lib/types';
import { Avatar } from './Avatar';
import { markdownStyles } from './markdownStyles';

const HAIRLINE = StyleSheet.hairlineWidth;

const THINK_RE = /<(?:thinking|think)>([\s\S]*?)<\/(?:thinking|think)>/gi;
const PROPOSAL_RE = /<proposal>([\s\S]*?)<\/proposal>/gi;
// **toolname**: ```json { ... } ``` — the injected tool-result format.
const TOOLRESULT_RE = /\*\*(\w+)\*\*:\s*```json\s*([\s\S]*?)```/g;
const SHELL_TOOLS = new Set(['shell_run', 'run_shell', 'bash', 'execute_shell', 'run_command']);

interface ToolResult {
  tool: string;
  data: Record<string, unknown>;
  raw: string;
}

// Mirrors the web frontend's strippedContent pipeline: pull <thinking> into a
// collapsible and drop backend-only structural markers (<final/>, proposals,
// analysis tags, tool_calls fences, echoed headers).
function cleanContent(content: string): { thinking: string | null; body: string } {
  const thinks: string[] = [];
  const body = content
    .replace(THINK_RE, (_m, inner: string) => {
      thinks.push(inner.trim());
      return '';
    })
    .replace(PROPOSAL_RE, '')
    .replace(
      /<\s*(?:analysis_thought|internal_thought|scratchpad)\s*>[\s\S]*?<\s*\/\s*(?:analysis_thought|internal_thought|scratchpad)\s*>/gi,
      '',
    )
    .replace(/<\s*final\s*\/?\s*>/gi, '')
    .replace(/<\s*final\s*>\s*<\s*\/\s*final\s*>/gi, '')
    .replace(/```[ \t]*(?:tool_calls|json|tools)[ \t]*\n[\s\S]*?```/gi, '')
    .replace(/```[ \t]*\n(?:tool_calls|json|tools)\n[\s\S]*?```/gi, '')
    .replace(/```[ \t]*\ntool_calls[\s\S]*?```/gi, '')
    .replace(/<tool_calls>[\s\S]*?<\/tool_calls>/gi, '')
    .replace(/^\*\*[\w_]+\*\*:[ \t]*$/gm, '')
    .replace(/^```\s*$/gm, '')
    .trim();
  return { thinking: thinks.length ? thinks.join('\n\n') : null, body };
}

// Extract **tool**: ```json …``` blocks; return them + the prose with them removed.
function extractToolResults(body: string): { prose: string; results: ToolResult[] } {
  const results: ToolResult[] = [];
  const prose = body.replace(TOOLRESULT_RE, (raw, tool: string, json: string) => {
    try {
      results.push({ tool, data: JSON.parse(json.trim()), raw });
    } catch {
      /* leave malformed json inline */
      return raw;
    }
    return '';
  });
  return { prose: prose.replace(/\[Tool results[^\]]*\]/g, '').trim(), results };
}

// During streaming, close any unclosed code fence / bold / inline-code so partial
// markdown renders cleanly (port of the web's completeStreamingMarkdown).
function completeStreamingMarkdown(raw: string): string {
  let s = raw;
  const fences = (s.match(/^```/gm) || []).length;
  if (fences % 2 !== 0) return s + '\n```';
  const noFences = s.replace(/```[\s\S]*?```/g, '');
  if ((noFences.match(/`/g) || []).length % 2 !== 0) s += '`';
  if ((noFences.match(/\*\*/g) || []).length % 2 !== 0) s += '**';
  return s;
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 6 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="sparkles-outline" size={13} color={colors.textFaint} />
        <Text style={{ color: colors.textFaint, fontSize: typography.size.sm }}>
          {open ? 'Hide reasoning' : 'Show reasoning'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textFaint} />
      </Pressable>
      {open && (
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, fontStyle: 'italic', marginTop: 6, lineHeight: 19 }}>
          {text}
        </Text>
      )}
    </View>
  );
}

function ToolResultCard({ result }: { result: ToolResult }) {
  const [open, setOpen] = useState(false);
  const isShell = SHELL_TOOLS.has(result.tool);
  const d = result.data;
  const exit = typeof d.exit_code === 'number' ? (d.exit_code as number) : isShell ? 0 : undefined;
  const output =
    (d.output as string) || (d.stdout as string) || (d.stderr as string) || '';
  const preview = isShell
    ? (output.split('\n')[0] || '').slice(0, 70)
    : Object.entries(d)
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
        .join('  ·  ');

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: radius.sm,
        borderWidth: HAIRLINE,
        borderColor: colors.border,
        marginTop: 6,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 }}
      >
        <Ionicons name="construct-outline" size={14} color={colors.primaryAlt} />
        <Text style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: '600' }}>{result.tool}</Text>
        {exit !== undefined ? (
          <View
            style={{
              backgroundColor: exit === 0 ? colors.successSoft : colors.dangerSoft,
              borderRadius: radius.sm,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text style={{ color: exit === 0 ? colors.success : colors.danger, fontSize: 10, fontWeight: '600' }}>
              exit {exit}
            </Text>
          </View>
        ) : null}
        <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: typography.size.xs, flex: 1 }}>
          {preview}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textFaint} />
      </Pressable>
      {open ? (
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: typography.family.mono,
            fontSize: 11,
            paddingHorizontal: 10,
            paddingBottom: 10,
          }}
        >
          {isShell ? output || '(no output)' : JSON.stringify(d, null, 2)}
        </Text>
      ) : null}
    </View>
  );
}

function MetadataFooter({ msg }: { msg: ChatMessage }) {
  const m = msg.metadata;
  if (!m) return null;
  const u = m.usage as
    | { input_tokens?: number; output_tokens?: number; cached_input_tokens?: number }
    | undefined;
  const parts: string[] = [];
  if (m.model) parts.push(m.model);
  if (u && (u.input_tokens != null || u.output_tokens != null)) {
    let t = `${u.input_tokens ?? 0}↑ ${u.output_tokens ?? 0}↓`;
    if (u.cached_input_tokens) t += ` · ${u.cached_input_tokens} cached`;
    parts.push(t);
  }
  if (m.cost_usd != null) parts.push(`$${m.cost_usd.toFixed(5)}`);
  if (m.duration_ms != null) parts.push(`${(m.duration_ms / 1000).toFixed(1)}s`);
  if (!parts.length) return null;
  return (
    <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 3, marginLeft: 4 }}>{parts.join('  ·  ')}</Text>
  );
}

export function MessageBubble({ msg, showAgent }: { msg: ChatMessage; showAgent: boolean }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const kind = msg.metadata?.kind;

  const { thinking, prose, results } = useMemo(() => {
    if (isUser) return { thinking: null, prose: msg.content, results: [] as ToolResult[] };
    const cleaned = cleanContent(msg.content);
    const { prose: p, results: r } = extractToolResults(cleaned.body);
    return { thinking: cleaned.thinking, prose: p, results: r };
  }, [msg.content, isUser]);

  const proseToRender = msg.streaming ? completeStreamingMarkdown(prose) : prose;

  // ── system / error ──
  if (isSystem) {
    return (
      <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
        <View
          style={{
            backgroundColor: msg.error ? colors.dangerSoft : colors.surface,
            borderRadius: radius.full,
            paddingHorizontal: 14,
            paddingVertical: 7,
            maxWidth: '88%',
          }}
        >
          <Text style={{ color: msg.error ? colors.danger : colors.textMuted, fontSize: typography.size.sm }}>
            {msg.content}
          </Text>
        </View>
      </View>
    );
  }

  // ── special assistant kinds (amber task brief, red task error) ──
  if (kind === 'task_brief' || kind === 'task_error') {
    const isErr = kind === 'task_error';
    return (
      <View style={{ paddingHorizontal: spacing.md, marginVertical: 6 }}>
        <View
          style={{
            backgroundColor: isErr ? colors.dangerSoft : colors.warningSoft,
            borderWidth: HAIRLINE,
            borderColor: isErr ? colors.danger : colors.warning,
            borderRadius: radius.lg,
            padding: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons
              name={isErr ? 'alert-circle' : 'briefcase-outline'}
              size={14}
              color={isErr ? colors.danger : colors.warning}
            />
            <Text
              style={{
                color: isErr ? colors.danger : colors.warning,
                fontSize: 10,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {isErr ? 'Task error' : 'Task brief'}
              {msg.agentName ? `  ·  ${msg.agentName}` : ''}
            </Text>
          </View>
          {isErr ? (
            <Text style={{ color: colors.danger, fontFamily: typography.family.mono, fontSize: 11 }}>{prose}</Text>
          ) : (
            <Markdown style={markdownStyles(false)}>{prose}</Markdown>
          )}
        </View>
      </View>
    );
  }

  // ── normal user / assistant bubble ──
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginVertical: 5,
        paddingHorizontal: spacing.md,
        gap: 8,
      }}
    >
      {!isUser && showAgent && <Avatar name={msg.agentName || 'Agent'} size={30} />}
      <View style={{ maxWidth: '82%' }}>
        {!isUser && showAgent && msg.agentName ? (
          <Text style={{ color: colors.textFaint, fontSize: typography.size.xs, marginBottom: 3, marginLeft: 4 }}>
            {msg.agentName}
            {kind === 'tool_result_injection' ? '  ·  tool result' : ''}
          </Text>
        ) : null}
        <View
          style={{
            backgroundColor: isUser ? colors.bubbleUser : colors.bubbleAgent,
            borderRadius: radius.lg,
            borderTopRightRadius: isUser ? 6 : radius.lg,
            borderTopLeftRadius: isUser ? radius.lg : 6,
            paddingHorizontal: 13,
            paddingVertical: 10,
            borderWidth: isUser ? 0 : HAIRLINE,
            borderColor: colors.border,
          }}
        >
          {thinking ? <ThinkingBlock text={thinking} /> : null}
          {proseToRender.length > 0 ? (
            <Markdown style={markdownStyles(isUser)}>{proseToRender}</Markdown>
          ) : results.length === 0 && msg.streaming ? (
            <Text style={{ color: colors.textMuted }}>…</Text>
          ) : null}
          {results.map((r, i) => (
            <ToolResultCard key={`${r.tool}-${i}`} result={r} />
          ))}
        </View>
        <MetadataFooter msg={msg} />
      </View>
    </View>
  );
}
