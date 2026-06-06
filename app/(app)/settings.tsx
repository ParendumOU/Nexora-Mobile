import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { useStore } from '@/lib/store';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const session = useStore((s) => s.session);
  const signOut = useStore((s) => s.signOut);

  const confirmUnlink = () => {
    Alert.alert(
      'Unlink this device?',
      'You will need to scan a new pairing QR code to use Nexora on this device again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/link');
          },
        },
      ],
    );
  };

  if (!session) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      {/* account card */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <Avatar name={session.userName} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: '600' }}>{session.userName}</Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>{session.userEmail}</Text>
        </View>
      </View>

      <Section title="Workspace">
        <Item icon="server-outline" label="Server" value={session.serverUrl.replace(/^https?:\/\//, '')} />
      </Section>

      <Section title="Device">
        <Item icon="phone-portrait-outline" label="Status" value="Linked" valueColor={colors.success} />
        <Pressable onPress={confirmUnlink}>
          <Item icon="log-out-outline" label="Unlink device" danger last />
        </Pressable>
      </Section>

      <Text style={{ color: colors.textFaint, textAlign: 'center', marginTop: spacing.xxxl, fontSize: typography.size.xs }}>
        Nexora Mobile · v0.1.0
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text
        style={{
          color: colors.textFaint,
          fontSize: typography.size.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: spacing.sm,
          marginLeft: 4,
        }}
      >
        {title}
      </Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Item({
  icon,
  label,
  value,
  valueColor,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  valueColor?: string;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.divider,
      }}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textMuted} />
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: typography.size.md, flex: 1 }}>{label}</Text>
      {value ? (
        <Text numberOfLines={1} style={{ color: valueColor || colors.textMuted, fontSize: typography.size.sm, maxWidth: '55%' }}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}
