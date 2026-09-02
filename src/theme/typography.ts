import { TextStyle } from 'react-native';

/**
 * Brand typography (2026-08 rebrand):
 *   • Baloo 2      — headings. Chunky rounded forms that match the
 *     RYTHU BIDDA plough-logo lettering (Ek Type; has a Telugu
 *     sibling, Baloo Tammudu 2, for a future bilingual UI).
 *   • Nunito Sans  — body/labels. Friendly and highly legible at
 *     small sizes.
 *
 * WHY file-per-weight instead of one variable font: React Native on
 * Android renders custom variable fonts at their DEFAULT instance
 * (weight 400) for every numeric fontWeight below bold — that's
 * exactly why the old Montserrat setup looked pale everywhere.
 * `familyFor()` maps an effective weight to the correct static file
 * (the filename IS the Android font family), and the Text component
 * then sets fontWeight:'normal' so Android never fake-bolds an
 * already-bold file.
 */

export const fonts = {
  regular: 'NunitoSans-Regular',
  semibold: 'NunitoSans-SemiBold',
  bold: 'NunitoSans-Bold',
  extrabold: 'NunitoSans-ExtraBold',
  headingSemibold: 'Baloo2-SemiBold',
  headingBold: 'Baloo2-Bold',
  headingExtrabold: 'Baloo2-ExtraBold',
};

/** Numeric value for a TextStyle fontWeight. */
function weightValue(w: TextStyle['fontWeight'] | undefined): number {
  if (w === undefined) return 400;
  if (w === 'bold') return 700;
  if (w === 'normal') return 400;
  const n = parseInt(String(w), 10);
  return Number.isFinite(n) ? n : 400;
}

/** Font file (= Android family name) for an effective weight. */
export function familyFor(
  weight: TextStyle['fontWeight'] | undefined,
  heading = false,
): string {
  const w = weightValue(weight);
  if (heading) {
    if (w >= 800) return fonts.headingExtrabold;
    if (w >= 700) return fonts.headingBold;
    return fonts.headingSemibold;
  }
  if (w >= 800) return fonts.extrabold;
  if (w >= 700) return fonts.bold;
  if (w >= 600) return fonts.semibold;
  return fonts.regular;
}

export const fontWeights = {
  thin: '100' as TextStyle['fontWeight'],
  light: '300' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 40,
};

export const lineHeights = {
  xs: 16,
  sm: 18,
  md: 20,
  base: 22,
  lg: 24,
  xl: 26,
  '2xl': 28,
  '3xl': 32,
  '4xl': 36,
  '5xl': 40,
  '6xl': 48,
};

type TextVariant = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
};

export const textVariants: Record<string, TextVariant> = {
  h1: {
    fontFamily: fonts.regular,
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights['5xl'],
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.regular,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.extrabold,
  },
  h3: {
    fontFamily: fonts.regular,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
  },
  h4: {
    fontFamily: fonts.regular,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.bold,
  },
  h5: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.bold,
  },
  h6: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.bold,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,     // 600 — small text reads solid app-wide
  },
  bodyBold: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.bold,         // true bold
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.semibold,     // 600 — checkout-style weight everywhere
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.bold,         // 700 — tiny text needs the most help
  },
  button: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.bold,         // 700 per spec
    letterSpacing: 0.3,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.bold,         // 700 — section labels anchor their cards
  },
};

export const typography = {
  fonts,
  fontWeights,
  fontSizes,
  lineHeights,
  variants: textVariants,
};

export type Typography = typeof typography;
