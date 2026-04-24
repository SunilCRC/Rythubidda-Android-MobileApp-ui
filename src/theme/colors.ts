/**
 * Rythu Bidda palette — warm earthy brown (#AB6639) is the single
 * source of truth for every primary action, active state, accent,
 * and brand touchpoint throughout the app. Secondary (gold) and
 * accent badge colors complement it without competing.
 *
 * Never hard-code color values in components — always reference
 * `colors.*` or `palette.*` below so the brand stays consistent.
 */

export const palette = {
  // Primary — warm earthy brown (#AB6639). Tints below are hand-picked
  // to read well against white and the cream background.
  primary: {
    50: '#FDF4EC',          // softest cream wash (card tint, chip bg)
    100: '#F5E6D8',         // warm ivory (category-tile bg)
    200: '#EBD4BC',         // tan (pressed state, light accents)
    300: '#DBB28C',         // sand
    400: '#C8925F',         // caramel
    500: '#AB6639',         // ★ BRAND
    600: '#8B532E',
    700: '#6A3F22',
    800: '#4A2C17',
    900: '#2D1A0D',
    DEFAULT: '#AB6639',
  },

  // Secondary — warm honey gold (harvest, sunlight). Used for "Best Seller"
  // ribbons and subtle backgrounds only.
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

  // Accent — complementary rust (sale banners, promo highlights).
  accent: {
    light: '#E58B5A',
    DEFAULT: '#D96A2C',
    dark: '#B04E17',
  },

  // Neutrals — warm greys, tuned darker so text reads crisp.
  // Intentionally no 400/500 light greys in the text scale — the
  // lightest "secondary text" is neutral[600] which still has strong contrast.
  neutral: {
    50: '#FAFAF7',
    100: '#F4F4EF',
    200: '#E6E5DD',
    300: '#CECDC0',
    400: '#8A8A80',         // darkened from #A6A598 — still readable as tertiary text
    500: '#555550',         // darkened from #7C7B70
    600: '#3E3D37',
    700: '#24241F',
    800: '#161612',
    900: '#0A0A08',
  },

  // Semantic — badges only
  success: '#2A9D8F',       // "In Stock" pill
  successLight: '#DCF5EC',
  error: '#E63946',         // discount pill
  errorLight: '#FCE4E6',
  warning: '#E6A23C',
  warningLight: '#FFF4DE',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const colors = {
  // Brand — everything primary-coloured flows from here
  primary: palette.primary.DEFAULT,        // #AB6639
  primaryLight: palette.primary[400],      // #C8925F
  primaryDark: palette.primary[700],       // #6A3F22
  primarySoft: palette.primary[50],        // #FDF4EC
  primaryMuted: palette.primary[100],      // #F5E6D8
  secondary: palette.secondary.DEFAULT,
  secondaryLight: palette.secondary[200],
  secondaryDark: palette.secondary[600],
  secondarySoft: palette.secondary[50],
  accent: palette.accent.DEFAULT,
  accentLight: palette.accent.light,
  accentDark: palette.accent.dark,

  // Call-to-action alias — kept for backward compat with code that used
  // `colors.cta`. Identical to `colors.primary` so nothing looks off-brand.
  cta: palette.primary.DEFAULT,            // #AB6639
  ctaDark: palette.primary[700],
  ctaLight: palette.primary[400],

  // Warm tint scale — use as soft card backgrounds, chip backgrounds,
  // icon-wells, etc. They're all lighter shades of the primary.
  tintSoft: palette.primary[50],           // #FDF4EC
  tintMid: palette.primary[100],           // #F5E6D8
  tintStrong: palette.primary[200],        // #EBD4BC

  // Surfaces
  background: '#FBFAF5',
  surface: palette.white,
  surfaceAlt: palette.neutral[50],
  surfaceElevated: palette.white,
  card: palette.white,
  border: '#E5E0D4',
  divider: palette.neutral[200],

  // Text — darker, higher contrast. No pale greys anywhere.
  textPrimary: palette.neutral[800],       // near-black with warmth
  textSecondary: palette.neutral[600],     // #3E3D37 — strong body color
  textTertiary: palette.neutral[500],      // #555550 — darker than old tertiary
  textMuted: palette.neutral[400],         // #8A8A80 — only for supporting captions
  textOnPrimary: palette.white,
  textOnSecondary: palette.primary[800],
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

  // Badge tones — dedicated so callers never hard-code hex
  badgeDiscount: palette.error,            // #E63946 red pill
  badgeDiscountText: palette.white,
  badgeInStock: palette.success,           // #2A9D8F teal pill
  badgeInStockText: palette.white,

  // States
  overlay: 'rgba(18, 18, 16, 0.55)',
  backdrop: 'rgba(18, 18, 16, 0.35)',
  glass: 'rgba(255, 255, 255, 0.9)',
  disabled: palette.neutral[200],
  disabledText: palette.neutral[400],
  pressed: palette.primary[100],           // #F5E6D8 — warm press wash
  focus: palette.primary.DEFAULT,          // #AB6639 — input focus border / cursor
  shimmerBase: palette.neutral[200],
  shimmerHighlight: palette.neutral[100],

  // Gradients (for LinearGradient)
  gradients: {
    primary: [palette.primary[400], palette.primary[700]] as [string, string],
    primarySoft: [palette.primary[50], palette.primary[200]] as [string, string],
    secondary: [palette.secondary[300], palette.secondary[500]] as [string, string],
    accent: [palette.accent.light, palette.accent.DEFAULT] as [string, string],
    harvest: [palette.secondary[200], palette.primary[300]] as [string, string],
    sunrise: [palette.accent.light, palette.secondary[300]] as [string, string],
    warmth: [palette.primary[100], palette.primary[300]] as [string, string],
  },

  // Category tile tint palette — rotates across cards for visual variety.
  // All variants are lighter shades of the brand so everything still
  // reads on-brand even at a glance.
  categoryTints: [
    '#FDF4EC',
    '#F5E6D8',
    '#FAE8D0',
    '#F7E1C6',
    '#FAEFDD',
    '#F3DEC4',
  ],

  // Raw palette for special cases
  palette,
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
};

export type Colors = typeof colors;
