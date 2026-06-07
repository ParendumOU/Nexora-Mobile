import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { ChatMessage } from '@/lib/types';
import { Avatar } from './Avatar';
import { markdownStyles } from './markdownStyles';

const THINK_RE = /<(?:thinking|think)>([\s\S]*?)<\/(?:thinking|think)>/gi;
const PROPOSAL_RE = /<proposal>([\s\S]*?)<\/proposal>/gi;

// Mirrors the web frontend's strippedContent pipeline (components/chat/message.tsx):
// extracts <thinking> into a collapsible and removes structural markers that are
// signals for the backend (watchdog/tools/proposals), not user-facing content —
// notably the bare <final/> turn-end marker.
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

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 6 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Ionicons name="sparkles-outline" size={13} color={colors.textFaint} />
        <Text style={{ color: colors.textFaint, fontSize: typography.size.sm }}>
          {open ? 'Hide reasoning' : 'Show reasoning'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textFaint} />
      </Pressable>
      {open && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.size.sm,
            fontStyle: 'italic',
            marginTop: 6,
            lineHeight: 19,
          }}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

export function MessageBubble({ msg, showAgent }: { msg: ChatMessage; showAgent: boolean }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const { thinking, body } = useMemo(
    () => (isUser ? { thinking: null, body: msg.content } : cleanContent(msg.content)),
    [msg.content, isUser],
  );

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
            borderWidth: isUser ? 0 : StyleSheet_hairline,
            borderColor: colors.border,
          }}
        >
          {thinking ? <ThinkingBlock text={thinking} /> : null}
          {body.length > 0 ? (
            <Markdown style={markdownStyles(isUser)}>{body}</Markdown>
          ) : msg.streaming ? (
            <Text style={{ color: colors.textMuted }}>…</Text>
          ) : null}
        </View>
        {msg.metadata?.model ? (
          <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 3, marginLeft: 4 }}>
            {msg.metadata.model}
            {msg.metadata.usage?.output_tokens ? ` · ${msg.metadata.usage.output_tokens} tok` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// hairline constant (avoid importing StyleSheet just for one value)
const StyleSheet_hairline = 0.5;
