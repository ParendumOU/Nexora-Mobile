import { Redirect, Stack } from 'expo-router';
import { useStore } from '@/lib/store';
import { colors, typography } from '@/theme/tokens';

export default function AppLayout() {
  const session = useStore((s) => s.session);
  if (!session) return <Redirect href="/link" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: typography.weight.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="chats" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ presentation: 'modal', title: 'New conversation' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
