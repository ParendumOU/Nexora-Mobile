import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { gradients, radius } from '@/theme/tokens';

/** Nexora icon mark (diamond stack) on the brand gradient tile — mirrors favicon.svg. */
export function Logo({ size = 40 }: { size?: number }) {
  const inner = size * 0.6;
  return (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={inner} height={inner} viewBox="0 0 32 32">
        <Path d="M16 4L6 14l10 5 10-5L16 4z" fill="#fff" opacity={0.95} />
        <Path d="M6 14l10 14 10-14-10 5-10-5z" fill="#fff" opacity={0.55} />
      </Svg>
    </LinearGradient>
  );
}

/** Bare mark without the tile (for small inline use). */
export function LogoMark({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Path d="M16 4L6 14l10 5 10-5L16 4z" fill={color} opacity={0.95} />
        <Path d="M6 14l10 14 10-14-10 5-10-5z" fill={color} opacity={0.55} />
      </Svg>
    </View>
  );
}
