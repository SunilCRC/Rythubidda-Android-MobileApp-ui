import { Platform, TextStyle } from 'react-native';

/**
 * Montserrat variable font is linked on both Android and iOS via react-native.config.js.
 * Font family name must match the asset filename (minus extension).
 */

export const fonts = {
  regular: Platform.select({
    ios: 'Montserrat',
    android: 'Montserrat',
    default: 'Montserrat',
  }) as string,
  italic: Platform.select({
    ios: 'Montserrat-Italic',
    android: 'Montserrat-Italic',
    default: 'Montserrat-Italic',
  }) as string,
};

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
    fontWeight: fontWeights.medium,       // bumped: no 400 anywhere
  },
  bodyBold: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.bold,         // bumped to true bold
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,       // bumped
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,       // bumped
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
    fontWeight: fontWeights.semibold,     // 600 per spec
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
