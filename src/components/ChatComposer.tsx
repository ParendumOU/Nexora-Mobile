import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { colors, gradients, radius, spacing } from '@/theme/tokens';

export function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text);
    setText('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
        backgroundColor: colors.bg,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 0.5,
          borderColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: Platform.OS === 'ios' ? 10 : 4,
          maxHeight: 140,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message your agent…"
          placeholderTextColor={colors.textFaint}
          multiline
          style={{ color: colors.text, fontSize: 16, lineHeight: 21 }}
        />
      </View>
      <Pressable onPress={submit} disabled={!canSend}>
        <LinearGradient
          colors={canSend ? gradients.brand : ([colors.surfaceAlt, colors.surfaceAlt] as const)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canSend ? 1 : 0.5,
          }}
        >
          <Ionicons name="arrow-up" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
