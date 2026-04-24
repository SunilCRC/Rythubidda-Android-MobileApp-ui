/**
 * Modern Rythu Bidda palette — earthy green (primary) × warm gold (secondary)
 * × crisp cream (background). Inspired by contemporary grocery/agri apps
 * (Zepto, Blinkit, Nykaa) while staying true to a farmer-first brand identity.
 */

export const palette = {
  // Primary — sage / forest green (farm, freshness, growth)
  primary: {
    50: '#F1F8F4',
    100: '#DDEEE1',
    200: '#B8DEC1',
    300: '#8FC99B',
    400: '#6AB478',
    500: '#3E9B5A',
    600: '#2F8548',
    700: '#236B39',
    800: '#18522A',
    900: '#0F3A1D',
    DEFAULT: '#2F8548',
  },

  // Secondary — warm honey gold (harvest, sunlight)
  secondary: {
    50: '#FDF8EC',
    100: '#F9EECA',
    200: '#F1DE98',
    300: '#E8CB64',
    400: '#DDB744',
    500: '#C99B2C',
    600: '#A87E22',
    700: '#7E5D18',
    800: '#553E10',
    900: '#2D2109',
    DEFAULT: '#DDB744',
  },

  // Accent — terracotta (pairs well with green + gold, signals sale/warmth)
  accent: {
    light: '#E58B5A',
    DEFAULT: '#D96A2C',
    dark: '#B04E17',
  },

  // Neutrals — warm greys
  neutral: {
    50: '#FAFAF7',
    100: '#F4F4EF',
    200: '#E6E5DD',
    300: '#CECDC0',
    400: '#A6A598',
    500: '#7C7B70',
    600: '#5A5A52',
    700: '#3E3D37',
    800: '#24241F',
    900: '#121210',
  },

  // Semantic
  success: '#2E7D32',
  successLight: '#DCF5DE',
  error: '#D64545',
  errorLight: '#FCE4E4',
  warning: '#E6A23C',
  warningLight: '#FFF4DE',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const colors = {
  // Brand
  primary: palette.primary.DEFAULT,
  primaryLight: palette.primary[400],
  primaryDark: palette.primary[700],
  primarySoft: palette.primary[50],
  secondary: palette.secondary.DEFAULT,
  secondaryLight: palette.secondary[200],
  secondaryDark: palette.secondary[600],
  secondarySoft: palette.secondary[50],
  accent: palette.accent.DEFAULT,
  accentLight: palette.accent.light,
  accentDark: palette.accent.dark,

  // Call-to-action (Add to cart, Buy now) — warm terracotta.
  // Intentionally distinct from the green primary so it pops on product cards.
  cta: '#AB6639',
  ctaDark: '#8B532E',
  ctaLight: '#C8794B',

  // Surfaces
  background: '#FBFAF5',           // fresh, warm off-white
  surface: palette.white,
  surfaceAlt: palette.neutral[50],
  surfaceElevated: palette.white,
  card: palette.white,
  border: '#ECEAE2',
  divider: palette.neutral[200],

  // Text
  textPrimary: palette.neutral[900],
  textSecondary: palette.neutral[600],
  textTertiary: palette.neutral[500],
  textOnPrimary: palette.white,
  textOnSecondary: palette.primary[800],
  textMuted: palette.neutral[400],
  textLink: palette.primary.DEFAULT,

  // Semantic
  success: palette.success,
  successSoft: palette.successLight,
  error: palette.error,
  errorSoft: palette.errorLight,
  warning: palette.warning,
  warningSoft: palette.warningLight,
  info: palette.info,
  infoSoft: palette.infoLight,

  // States
  overlay: 'rgba(18, 18, 16, 0.55)',
  backdrop: 'rgba(18, 18, 16, 0.35)',
  glass: 'rgba(255, 255, 255, 0.85)',
  disabled: palette.neutral[200],
  disabledText: palette.neutral[400],
  pressed: palette.primary[100],
  shimmerBase: palette.neutral[200],
  shimmerHighlight: palette.neutral[100],

  // Gradients (arrays for LinearGradient)
  gradients: {
    primary: [palette.primary[400], palette.primary[700]] as [string, string],
    secondary: [palette.secondary[300], palette.secondary[500]] as [string, string],
    accent: [palette.accent.light, palette.accent.DEFAULT] as [string, string],
    harvest: [palette.secondary[200], palette.primary[300]] as [string, string],
    sunrise: [palette.accent.light, palette.secondary[300]] as [string, string],
    freshness: [palette.primary[100], palette.primary[300]] as [string, string],
  },

  // Raw palette for special cases
  palette,
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
};

export type Colors = typeof colors;
