import { StyleSheet } from 'react-native';
import { colors, radius, typography } from '@/theme/tokens';

/** react-native-markdown-display style map tuned to the Nexora dark theme. */
export const markdownStyles = (onBubble: boolean) =>
  StyleSheet.create({
    body: {
      color: onBubble ? '#fff' : colors.text,
      fontSize: typography.size.base,
      lineHeight: 22,
    },
    paragraph: { marginTop: 0, marginBottom: 8, flexWrap: 'wrap' },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    link: { color: onBubble ? '#e0e7ff' : colors.primaryAlt, textDecorationLine: 'underline' },
    heading1: { color: onBubble ? '#fff' : colors.text, fontSize: 22, fontWeight: '700', marginVertical: 8 },
    heading2: { color: onBubble ? '#fff' : colors.text, fontSize: 19, fontWeight: '700', marginVertical: 6 },
    heading3: { color: onBubble ? '#fff' : colors.text, fontSize: 17, fontWeight: '600', marginVertical: 6 },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { marginBottom: 4 },
    code_inline: {
      backgroundColor: onBubble ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)',
      color: onBubble ? '#fff' : '#c7d2fe',
      borderRadius: 5,
      paddingHorizontal: 5,
      paddingVertical: 1,
      fontFamily: typography.family.mono,
      fontSize: 13,
    },
    code_block: codeBlock(onBubble),
    fence: codeBlock(onBubble),
    blockquote: {
      backgroundColor: 'rgba(99,102,241,0.10)',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 8,
    },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: 10 },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, marginBottom: 8 },
    th: { padding: 6, fontWeight: '700', color: colors.text },
    td: { padding: 6, borderColor: colors.border },
  });

function codeBlock(onBubble: boolean) {
  return {
    backgroundColor: onBubble ? 'rgba(0,0,0,0.28)' : '#0c0c14',
    color: '#e2e8f0',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    marginVertical: 6,
    fontFamily: typography.family.mono,
    fontSize: 13,
  };
}
