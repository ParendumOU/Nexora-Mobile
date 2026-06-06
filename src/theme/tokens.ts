/**
 * Nexora brand design tokens — mirrors the web frontend (dark-first).
 * Source of truth: Nexora/frontend globals.css + tailwind.config.ts.
 */
import { Platform } from 'react-native';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const colors = {
  // Surfaces (dark-first)
  bg: '#0a0a0f', // app background
  bgElevated: '#0e0e16', // slightly raised panels
  surface: '#14141f', // cards / sheets
  surfaceAlt: '#1a1a2e', // modal / pressed
  surfaceHover: '#1d1d2b',

  // Brand
  primary: '#6366f1', // indigo
  primaryDim: '#4f46e5',
  primaryAlt: '#8b5cf6', // violet
  primarySoft: 'rgba(99,102,241,0.14)',
  primaryBorder: 'rgba(99,102,241,0.35)',

  // Text
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  textInverse: '#0a0a0f',

  // Lines
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.05)',

  // Status
  success: '#34d399',
  successSoft: 'rgba(52,211,153,0.14)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251,191,36,0.14)',
  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.14)',

  // Bubbles
  bubbleUser: '#6366f1',
  bubbleAgent: '#16161f',

  // Misc
  overlay: 'rgba(5,5,10,0.7)',
  shimmer: 'rgba(255,255,255,0.06)',
} as const;

export const gradients = {
  brand: ['#6366f1', '#8b5cf6'] as const, // 135deg in usage
  brandFaint: ['rgba(99,102,241,0.18)', 'rgba(139,92,246,0.10)'] as const,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const typography = {
  // Geist is the web brand font. Bundled via @expo-google-fonts/geist when available;
  // falls back to the platform system font (San Francisco / Roboto) which reads clean.
  family: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    mono: MONO,
  },
  size: {
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const shadow = {
  // Brand uses subtle borders + glow rather than heavy drop shadows.
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

export type Colors = typeof colors;
