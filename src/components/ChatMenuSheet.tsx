import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import type { ChatNote, HierarchyNode, PlanStep, TaskItem } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Tab = 'tasks' | 'plan' | 'notes' | 'agents';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline' },
  { key: 'plan', label: 'Plan', icon: 'list-outline' },
  { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { key: 'agents', label: 'Agents', icon: 'git-branch-outline' },
];

const statusColor = (s: string) => {
  const v = (s || '').toLowerCase();
  if (v.includes('success') || v.includes('done') || v.includes('complete')) return colors.success;
  if (v.includes('fail') || v.includes('error') || v.includes('stall')) return colors.danger;
  if (v.includes('run') || v.includes('progress') || v.includes('queue')) return colors.primary;
  if (v.includes('await') || v.includes('pending') || v.includes('pause')) return colors.warning;
  return colors.textFaint;
};

export function ChatMenuSheet({
  chatId,
  visible,
  onClose,
}: {
  chatId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('tasks');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [planTitle, setPlanTitle] = useState<string | null>(null);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    const run = async () => {
      try {
        if (tab === 'tasks') {
          const t = await api.getTasks(chatId).catch(() => []);
          if (alive) setTasks(Array.isArray(t) ? t : []);
        } else if (tab === 'plan') {
          const plans = await api.getPlans(chatId).catch(() => []);
          // The active plan (fallback to the first) drives the panel.
          const active = (plans || []).find((p) => p.status === 'active') ?? (plans || [])[0];
          if (alive) {
            setPlan(active?.steps ?? []);
            setPlanTitle(active?.title ?? null);
          }
        } else if (tab === 'notes') {
          const res = await api.getNotes(chatId).catch(() => null);
          if (alive) setNotes(res?.notes ?? []);
        } else if (tab === 'agents') {
          const h = await api.getHierarchy(chatId).catch(() => null);
          if (alive) setHierarchy(h?.nodes ?? []);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [tab, visible, chatId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '78%',
          backgroundColor: colors.bgElevated,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          borderTopWidth: 0.5,
          borderColor: colors.border,
          paddingBottom: insets.bottom + spacing.md,
        }}
      >
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, gap: 8, marginBottom: spacing.sm }}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 9,
                  borderRadius: radius.md,
                  backgroundColor: active ? colors.primarySoft : 'transparent',
                  borderWidth: active ? 0.5 : 0,
                  borderColor: colors.primaryBorder,
                }}
              >
                <Ionicons name={t.icon} size={18} color={active ? colors.primary : colors.textMuted} />
                <Text
                  style={{
                    color: active ? colors.primary : colors.textMuted,
                    fontSize: typography.size.xs,
                    marginTop: 3,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView style={{ paddingHorizontal: spacing.lg }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <>
              {tab === 'tasks' && <TaskList tasks={tasks} />}
              {tab === 'plan' && <PlanList plan={plan} title={planTitle} />}
              {tab === 'notes' && <NoteList notes={notes} />}
              {tab === 'agents' && <HierarchyList nodes={hierarchy} currentId={chatId} />}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={{ color: colors.textFaint, textAlign: 'center', marginTop: 28 }}>{text}</Text>;
}

function Row({ title, sub, status, indent = 0 }: { title: string; sub?: string; status?: string; indent?: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingLeft: indent * 18,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
      }}
    >
      {status ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor(status) }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: typography.size.base }}>{title}</Text>
        {sub ? <Text style={{ color: colors.textFaint, fontSize: typography.size.xs, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {status ? (
        <Text style={{ color: statusColor(status), fontSize: typography.size.xs, fontWeight: '600' }}>{status}</Text>
      ) : null}
    </View>
  );
}

function TaskList({ tasks }: { tasks: TaskItem[] }) {
  if (!tasks.length) return <Empty text="No tasks in this conversation yet." />;
  // Render parents then their children, indented.
  const roots = tasks.filter((t) => !t.parent_id);
  const childrenOf = (id: string) => tasks.filter((t) => t.parent_id === id);
  const rows: { task: TaskItem; depth: number }[] = [];
  const walk = (t: TaskItem, depth: number) => {
    rows.push({ task: t, depth });
    childrenOf(t.id).forEach((c) => walk(c, depth + 1));
  };
  (roots.length ? roots : tasks).forEach((t) => walk(t, 0));
  return (
    <>
      {rows.map(({ task, depth }) => (
        <Row
          key={task.id}
          title={task.title}
          sub={task.assigned_agent_name ?? undefined}
          status={task.status}
          indent={depth}
        />
      ))}
    </>
  );
}

function PlanList({ plan, title }: { plan: PlanStep[]; title: string | null }) {
  if (!plan.length) return <Empty text="No plan has been laid out yet." />;
  return (
    <>
      {title ? (
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.size.md, marginBottom: 6 }}>
          {title}
        </Text>
      ) : null}
      {plan
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((s, i) => (
          <Row key={s.id} title={`${i + 1}. ${s.title}`} sub={s.note ?? undefined} status={s.status} />
        ))}
    </>
  );
}

function NoteList({ notes }: { notes: ChatNote[] }) {
  if (!notes.length) return <Empty text="No notes saved." />;
  return (
    <>
      {notes.map((n) => (
        <View
          key={n.id}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: 12,
            marginVertical: 5,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          {n.description ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs, marginBottom: 4 }}>
              {n.description}
            </Text>
          ) : null}
          <Text style={{ color: colors.text, fontSize: typography.size.base, lineHeight: 21 }}>{n.content}</Text>
          {n.author ? (
            <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 6 }}>— {n.author}</Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

/** Agent execution hierarchy: the chat tree (ancestors → current → sub-agent chats).
 * Sub-agent chats are the descendants (parent_chat_id chain) of the open chat. */
function HierarchyList({ nodes, currentId }: { nodes: HierarchyNode[]; currentId: string }) {
  // Only the current chat with no descendants = nothing to show as "agents".
  const hasOthers = nodes.some((n) => n.id !== currentId);
  if (!nodes.length || !hasOthers) return <Empty text="No sub-agents spawned in this chat yet." />;

  // Normalize depths so the shallowest node sits at indent 0.
  const minDepth = Math.min(...nodes.map((n) => n.depth));
  const ordered = [...nodes].sort((a, b) => a.depth - b.depth);

  return (
    <>
      {ordered.map((n) => {
        const total = n.task_counts?.total ?? 0;
        const isCurrent = n.id === currentId;
        const roleLabel = n.node_type === 'ancestor' ? 'parent' : n.node_type === 'descendant' ? 'sub-agent' : 'here';
        return (
          <Row
            key={n.id}
            indent={n.depth - minDepth}
            title={`${n.agent_name || n.title}${isCurrent ? '  ·  (here)' : ''}`}
            sub={`${roleLabel}${total ? ` · ${total} task${total === 1 ? '' : 's'}` : ''}`}
            status={n.status}
          />
        );
      })}
    </>
  );
}
