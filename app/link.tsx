import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { ApiError, normalizeServerUrl, pairDevice } from '@/lib/api';
import { useStore } from '@/lib/store';
import { colors, gradients, radius, spacing, typography } from '@/theme/tokens';

const PLATFORM = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';
const DEFAULT_NAME = Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android device' : 'Mobile device';

export default function LinkScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setSession = useStore((s) => s.setSession);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState(DEFAULT_NAME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  const finish = async (url: string, pairCode: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const normalized = normalizeServerUrl(url);
      const session = await pairDevice(normalized, pairCode, deviceName || DEFAULT_NAME, PLATFORM);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setSession(session);
      router.replace('/(app)/chats');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not reach that server. Check the URL and network.';
      setError(msg);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      locked.current = false;
    } finally {
      setBusy(false);
    }
  };

  const onScan = (data: string) => {
    if (locked.current) return;
    locked.current = true;
    setScanning(false);
    try {
      const parsed = JSON.parse(data);
      if (parsed?.url && parsed?.code) {
        finish(String(parsed.url), String(parsed.code));
        return;
      }
      throw new Error('bad payload');
    } catch {
      setError('That QR code is not a Nexora pairing code.');
      locked.current = false;
    }
  };

  const startScan = async () => {
    setError(null);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('Camera permission is required to scan the pairing code.');
        return;
      }
    }
    locked.current = false;
    setScanning(true);
  };

  // ── camera overlay ──
  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(r) => onScan(r.data)}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 250,
              height: 250,
              borderRadius: radius.xxl,
              borderWidth: 3,
              borderColor: colors.primary,
            }}
          />
          <Text style={{ color: '#fff', marginTop: spacing.xl, fontSize: typography.size.md }}>
            Point at the QR on your Nexora workspace
          </Text>
        </View>
        <Pressable
          onPress={() => setScanning(false)}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 20,
            backgroundColor: colors.overlay,
            borderRadius: radius.full,
            padding: 10,
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, paddingTop: insets.top + 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* brand */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
          <Logo size={68} />
          <Text style={{ color: colors.text, fontSize: typography.size.display, fontWeight: '700', marginTop: spacing.lg }}>
            Nexora
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.size.md, marginTop: 6, textAlign: 'center' }}>
            Link this device to your workspace
          </Text>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: colors.dangerSoft,
              borderRadius: radius.md,
              padding: 12,
              marginBottom: spacing.lg,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, flex: 1, fontSize: typography.size.sm }}>{error}</Text>
          </View>
        ) : null}

        {/* primary action: scan */}
        <Pressable onPress={startScan} disabled={busy}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: radius.lg,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="qr-code-outline" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: typography.size.md, fontWeight: '600' }}>Scan pairing QR code</Text>
          </LinearGradient>
        </Pressable>

        <Text style={{ color: colors.textFaint, textAlign: 'center', marginVertical: spacing.lg, fontSize: typography.size.sm }}>
          Settings → Link device on your Nexora workspace shows the QR
        </Text>

        {/* manual toggle */}
        <Pressable
          onPress={() => setManual((m) => !m)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Ionicons name="create-outline" size={16} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
            {manual ? 'Hide manual entry' : 'Enter details manually'}
          </Text>
        </Pressable>

        {manual && (
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Field label="Server URL" value={serverUrl} onChange={setServerUrl} placeholder="https://nexora.mycompany.com" keyboard="url" />
            <Field label="Pairing code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="ABCD2345" autoCap />
            <Field label="Device name" value={deviceName} onChange={setDeviceName} placeholder={DEFAULT_NAME} />
            <Pressable
              onPress={() => finish(serverUrl, code)}
              disabled={busy || !serverUrl.trim() || !code.trim()}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                paddingVertical: 15,
                alignItems: 'center',
                opacity: busy || !serverUrl.trim() || !code.trim() ? 0.5 : 1,
                marginTop: 4,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: typography.size.md }}>Link device</Text>
              )}
            </Pressable>
          </View>
        )}

        {busy && !manual ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  autoCap,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'url' | 'default';
  autoCap?: boolean;
}) {
  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: typography.size.sm, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize={autoCap ? 'characters' : 'none'}
        autoCorrect={false}
        keyboardType={keyboard === 'url' ? 'url' : 'default'}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 0.5,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: colors.text,
          fontSize: typography.size.md,
        }}
      />
    </View>
  );
}
