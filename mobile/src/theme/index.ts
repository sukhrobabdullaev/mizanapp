/** Design tokens. Every colour/spacing value in the app comes from here. */

export const colors = {
  background: '#F7F8F7',
  card: '#FFFFFF',
  bgDark: '#0A1712',
  cardDark: '#121E18',
  gradientStart: '#0FA36B',
  gradientEnd: '#4EE6A8',
  textPrimary: '#101613',
  textSecondary: '#6B7570',
  gold: '#C9A24B',
  danger: '#E53E3E',
  amber: '#F6A623',
  border: '#E6EAE8',
  borderDark: '#1E2C25',
  track: '#EDF0EE',
  dimensions: {
    ruhiy: '#4EE6A8',
    jismoniy: '#0FA36B',
    moliyaviy: '#C9A24B',
    ijtimoiy: '#4A90D9',
    ilmiy: '#9B7FD4',
  },
} as const;

export type DimensionKey = keyof typeof colors.dimensions;

/** Light/dark palettes resolved by `useTheme`. */
export const palettes = {
  light: {
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    textMuted: colors.textSecondary,
    border: colors.border,
    track: colors.track,
    sadaqaCard: '#F6F1E4',
    sadaqaInner: '#FFFFFFAA',
    sadaqaText: '#5C5342',
    sadaqaStrong: '#3F3928',
  },
  dark: {
    background: colors.bgDark,
    card: colors.cardDark,
    text: '#F2F6F4',
    textMuted: '#93A09A',
    border: colors.borderDark,
    track: '#1A2620',
    sadaqaCard: '#1E1A10',
    sadaqaInner: '#00000033',
    sadaqaText: '#CBBE9B',
    sadaqaStrong: '#F0E5C8',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  card: 20,
  pill: 9999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 19, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0B2018',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const priorityColor = {
  high: colors.danger,
  medium: colors.amber,
  low: colors.textSecondary,
} as const;
