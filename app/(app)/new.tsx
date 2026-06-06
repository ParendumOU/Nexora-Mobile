import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function NewChatScreen() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .listAgents()
      .then((a) => setAgents((a || []).filter((x) => x.is_active !== false)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const start = async (agent?: Agent) => {
    if (creating) return;
    setCreating(true);
    try {
      const chat = await api.createChat({
        title: agent ? `Chat with ${agent.name}` : 'New chat',
        agent_id: agent?.id ?? null,
      });
      router.replace({
        pathname: `/(app)/chat/${chat.id}`,
        params: { title: chat.title, agentId: agent?.id ?? '' },
      });
    } catch {
      setCreating(false);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <FlatList
      data={agents}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: spacing.lg }}
      ListHeaderComponent={
        <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, marginBottom: spacing.md }}>
          Choose an agent to start a conversation
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => start(item)}
          disabled={creating}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            borderRadius: radius.lg,
            borderWidth: 0.5,
            borderColor: colors.border,
            padding: 14,
            marginBottom: spacing.sm,
          })}
        >
          <Avatar name={item.name} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: typography.size.md, fontWeight: '600' }}>{item.name}</Text>
            {item.description ? (
              <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.sm, marginTop: 2 }}>
                {item.description}
              </Text>
            ) : (
              <Text style={{ color: colors.textFaint, fontSize: typography.size.sm, marginTop: 2 }}>{item.agent_type}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
        </Pressable>
      )}
      ListFooterComponent={
        <Pressable
          onPress={() => start()}
          disabled={creating}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            marginTop: spacing.sm,
          }}
        >
          {creating ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: typography.size.md, fontWeight: '600' }}>
                Start without a specific agent
              </Text>
            </>
          )}
        </Pressable>
      }
    />
  );
}
