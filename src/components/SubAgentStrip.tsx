import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { SubAgentActivity } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const stepIcon = (status: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  if (status === 'success') return { name: 'checkmark-circle', color: colors.success };
  if (status === 'failed') return { name: 'close-circle', color: colors.danger };
  return { name: 'ellipse-outline', color: colors.primary };
};

/** Live sub-agent activity, shown above the composer while sub-agents run.
 * Mirrors the web's sub-agent activity panel (cards with streamed output + steps). */
export function SubAgentStrip({ activities }: { activities: SubAgentActivity[] }) {
  const [open, setOpen] = useState(true);
  if (!activities.length) return null;
  const running = activities.filter((a) => !a.done).length;

  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 0.5,
        borderColor: colors.primaryBorder,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9 }}
      >
        <Ionicons name="git-branch-outline" size={15} color={colors.primaryAlt} />
        <Text style={{ color: colors.text, fontSize: typography.size.sm, fontWeight: '600', flex: 1 }}>
          {running > 0 ? `${running} sub-agent${running === 1 ? '' : 's'} working` : 'Sub-agents'}
          <Text style={{ color: colors.textFaint, fontWeight: '400' }}> · {activities.length}</Text>
        </Text>
        <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={15} color={colors.textFaint} />
      </Pressable>

      {open ? (
        <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={{ paddingBottom: 6 }}>
          {activities.map((a) => {
            const dot = a.done ? (a.failed ? colors.danger : colors.success) : colors.primary;
            return (
              <View key={a.taskId} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.sm, flex: 1 }}>
                    {a.agentName}
                    {a.taskTitle ? <Text style={{ color: colors.textFaint }}>{`  ·  ${a.taskTitle}`}</Text> : null}
                  </Text>
                </View>
                {a.steps.map((s) => {
                  const ic = stepIcon(s.status);
                  return (
                    <View key={s.stepId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, marginTop: 3 }}>
                      <Ionicons name={ic.name} size={12} color={ic.color} />
                      <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: typography.size.xs, flex: 1 }}>
                        {s.label}
                        {s.error ? <Text style={{ color: colors.danger }}>{`  ${s.error}`}</Text> : null}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
