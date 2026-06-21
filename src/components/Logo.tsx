import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { gradients, radius } from '@/theme/tokens';

/** White network-N glyph (3 strokes + nodes), drawn in a 0 0 32 32 viewBox. */
function Glyph({ color = '#fff' }: { color?: string }) {
  return (
    <>
      <Line x1={10} y1={24} x2={10} y2={8} stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      <Line x1={10} y1={8} x2={22} y2={24} stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      <Line x1={22} y1={24} x2={22} y2={8} stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      <Circle cx={10} cy={8} r={2.7} fill={color} />
      <Circle cx={22} cy={24} r={2.7} fill={color} />
      <Circle cx={10} cy={24} r={2} fill={color} />
      <Circle cx={22} cy={8} r={2} fill={color} />
      <Circle cx={16} cy={16} r={1.7} fill={color} />
    </>
  );
}

/** Nexora network-N mark on the brand gradient tile — matches favicon.svg. */
export function Logo({ size = 40 }: { size?: number }) {
  const inner = size * 0.62;
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
        <Glyph color="#fff" />
      </Svg>
    </LinearGradient>
  );
}

/** Bare mark without the tile (for small inline use). */
export function LogoMark({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Glyph color={color} />
      </Svg>
    </View>
  );
}
