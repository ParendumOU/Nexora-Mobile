import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatMenuSheet } from '@/components/ChatMenuSheet';
import { MessageBubble } from '@/components/MessageBubble';
import { TypingDots } from '@/components/TypingDots';
import { api } from '@/lib/api';
import type { Chat, ChatMessage } from '@/lib/types';
import { useChat } from '@/lib/useChat';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ChatScreen() {
  const { id, title: titleParam, agentId } = useLocalSearchParams<{ id: string; title?: string; agentId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const { messages, status, activity, loadingHistory, send } = useChat(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);

  useEffect(() => {
    api.getChat(id).then(setChat).catch(() => {});
  }, [id]);

  // auto-scroll to newest
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length, activity]);

  const title = chat?.title || titleParam || 'Conversation';
  const subtitle =
    status === 'open'
      ? chat?.agent_name || 'Connected'
      : status === 'reconnecting'
        ? 'Reconnecting…'
        : status === 'connecting'
          ? 'Connecting…'
          : 'Offline';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 6,
          paddingBottom: 10,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          gap: 4,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.size.md, fontWeight: '600' }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: status === 'open' ? colors.success : colors.warning,
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>{subtitle}</Text>
          </View>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="layers-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m, i) => m.id || String(i)}
        renderItem={({ item, index }) => {
          const prev = messages[index - 1];
          const showAgent = item.role === 'assistant' && (!prev || prev.role !== 'assistant');
          return <MessageBubble msg={item} showAgent={showAgent} />;
        }}
        contentContainerStyle={{ paddingVertical: spacing.md, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          !loadingHistory ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <Ionicons name="sparkles-outline" size={40} color={colors.textFaint} />
              <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>Say hello to get started</Text>
            </View>
          ) : null
        }
      />

      {/* activity indicator */}
      {activity ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 4 }}>
          <TypingDots />
          <Text style={{ color: colors.textFaint, fontSize: typography.size.xs }}>{activity}</Text>
        </View>
      ) : null}

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatComposer onSend={(t) => send(t, { agentId: agentId ?? chat?.agent_id })} disabled={status === 'closed'} />
      </View>

      <ChatMenuSheet chatId={id} visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </KeyboardAvoidingView>
  );
}
