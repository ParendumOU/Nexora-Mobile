import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import { gradients, radius } from '@/theme/tokens';

/** Deterministic gradient avatar with the agent/user initials. */
export function Avatar({ name, size = 38 }: { name?: string | null; size?: number }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{initials}</Text>
    </LinearGradient>
  );
}
