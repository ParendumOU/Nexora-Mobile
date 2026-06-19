import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { LogoMark } from '@/components/Logo';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { Chat } from '@/lib/types';
import { colors, gradients, radius, spacing, typography } from '@/theme/tokens';

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useStore((s) => s.session);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create a plain chat (no agent — the platform routes to the default provider/
  // agent, same as the web frontend) and open it.
  const newChat = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const chat = await api.createChat({ title: 'New Chat' });
      router.push(`/(app)/chat/${chat.id}`);
    } catch {
      // ignore; pull-to-refresh / retry
    } finally {
      setCreating(false);
    }
  }, [creating, router]);

  const load = useCallback(async () => {
    try {
      const data = await api.listChats();
      setChats((data || []).filter((c) => !c.is_archived));
    } catch {
      /* surfaced via empty state */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: 10,
        }}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }}
        >
          <LogoMark size={20} />
        </LinearGradient>
        <Text style={{ color: colors.text, fontSize: typography.size.xl, fontWeight: '700', flex: 1 }}>Chats</Text>
        <Pressable onPress={() => router.push('/(app)/settings')} hitSlop={10}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.xxxl }}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.textFaint} />
              <Text style={{ color: colors.textMuted, marginTop: spacing.md, textAlign: 'center', fontSize: typography.size.md }}>
                No conversations yet
              </Text>
              <Text style={{ color: colors.textFaint, marginTop: 6, textAlign: 'center', fontSize: typography.size.sm }}>
                Tap the button below to start a conversation.
              </Text>
              <Pressable
                onPress={newChat}
                style={{
                  marginTop: spacing.xl,
                  backgroundColor: colors.primary,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.xl,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: typography.size.md }}>New chat</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <ChatRow chat={item} onPress={() => router.push(`/(app)/chat/${item.id}`)} />}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={newChat}
        disabled={creating}
        style={{ position: 'absolute', right: spacing.xl, bottom: insets.bottom + spacing.xl, opacity: creating ? 0.6 : 1 }}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 58,
            height: 58,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.primary,
            shadowOpacity: 0.4,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function ChatRow({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: 13,
        backgroundColor: pressed ? colors.surface : 'transparent',
      })}
    >
      <Avatar name={chat.agent_name || chat.title} size={48} />
      <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: colors.divider, paddingBottom: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.md, fontWeight: '600', flex: 1 }}>
            {chat.title || 'Untitled'}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: typography.size.sm, marginTop: 3 }}>
          {chat.last_message_preview || chat.agent_name || 'Tap to open'}
        </Text>
      </View>
    </Pressable>
  );
}
