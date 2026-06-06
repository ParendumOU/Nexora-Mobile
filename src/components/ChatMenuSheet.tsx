import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import type { ChatNote, PlanStep, TaskItem } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Tab = 'tasks' | 'plan' | 'notes' | 'hierarchy';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline' },
  { key: 'plan', label: 'Plan', icon: 'list-outline' },
  { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { key: 'hierarchy', label: 'Agents', icon: 'git-branch-outline' },
];

const statusColor = (s: string) => {
  const v = s?.toLowerCase() ?? '';
  if (v.includes('success') || v.includes('done') || v.includes('complete')) return colors.success;
  if (v.includes('fail') || v.includes('error')) return colors.danger;
  if (v.includes('run') || v.includes('progress')) return colors.primary;
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
  const [notes, setNotes] = useState<ChatNote[]>([]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    const run = async () => {
      try {
        if (tab === 'tasks' || tab === 'hierarchy') {
          const t = await api.getTasks(chatId).catch(() => []);
          if (alive) setTasks(Array.isArray(t) ? t : []);
        } else if (tab === 'plan') {
          const p = await api.getPlan(chatId).catch(() => []);
          const steps = Array.isArray(p) ? p : (p?.steps ?? []);
          if (alive) setPlan(steps);
        } else if (tab === 'notes') {
          const n = await api.getNotes(chatId).catch(() => []);
          if (alive) setNotes(Array.isArray(n) ? n : []);
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

        {/* segmented tabs */}
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
              {tab === 'hierarchy' && <Hierarchy tasks={tasks} />}
              {tab === 'plan' && <PlanList plan={plan} />}
              {tab === 'notes' && <NoteList notes={notes} />}
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

function Row({ title, sub, status }: { title: string; sub?: string; status?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
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
  return (
    <>
      {tasks.map((t) => (
        <Row key={t.id} title={t.title} sub={t.agent_name ?? undefined} status={t.status} />
      ))}
    </>
  );
}

function PlanList({ plan }: { plan: PlanStep[] }) {
  if (!plan.length) return <Empty text="No plan has been laid out yet." />;
  return (
    <>
      {plan
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s, i) => (
          <Row key={s.id} title={`${i + 1}. ${s.title}`} status={s.status} />
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
          <Text style={{ color: colors.text, fontSize: typography.size.base, lineHeight: 21 }}>{n.content}</Text>
        </View>
      ))}
    </>
  );
}

/** Lightweight agent tree: groups tasks by their assigned agent. */
function Hierarchy({ tasks }: { tasks: TaskItem[] }) {
  if (!tasks.length) return <Empty text="No sub-agent activity yet." />;
  const byAgent = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    const key = t.agent_name || 'Orchestrator';
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key)!.push(t);
  }
  return (
    <>
      {[...byAgent.entries()].map(([agent, items]) => (
        <View key={agent} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="hardware-chip-outline" size={16} color={colors.primaryAlt} />
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.size.base }}>{agent}</Text>
            <Text style={{ color: colors.textFaint, fontSize: typography.size.xs }}>({items.length})</Text>
          </View>
          {items.map((t) => (
            <View key={t.id} style={{ paddingLeft: 24 }}>
              <Row title={t.title} status={t.status} />
            </View>
          ))}
        </View>
      ))}
    </>
  );
}
