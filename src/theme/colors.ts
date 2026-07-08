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
  // PALETTE PARITY WITH rythubidda.com — kept in lock-step with
  // `Rythubidda-UI/tailwind.config.js`. If you change a token here,
  // change the SAME token on the web side or the two apps will look
  // off-brand from each other. The mobile and web home screens are
  // the user's primary brand recognition cue; consistency matters.

  // Primary — warm caramel brown. DEFAULT (#AE6F4C) is the single
  // source of truth for every primary action, active state, accent,
  // and brand touchpoint throughout the app.
  primary: {
    50: '#F7EEE8',          // softest cream wash (card tint, chip bg)
    100: '#EFDDD1',         // warm ivory (category-tile bg)
    200: '#DFBBA3',         // tan (pressed state, light accents)
    300: '#C8794B',         // sand
    400: '#B87447',         // caramel
    500: '#AE6F4C',         // ★ BRAND (matches web primary.DEFAULT)
    600: '#AB6639',         // deeper earth brown (used as colors.accent)
    700: '#8B532E',
    800: '#6A3F22',
    900: '#4A2C17',
    DEFAULT: '#AE6F4C',
  },

  // Secondary — warm cream beige. Matches web. Used for soft backgrounds,
  // "Best Seller" ribbons, secondary buttons.
  secondary: {
    50: '#FAF7F3',
    100: '#F5EFE7',
    200: '#EBE0CF',
    300: '#E1CAB3',         // ★ web secondary.DEFAULT
    400: '#D7B997',
    500: '#E1CAB3',
    600: '#C9A887',
    700: '#A88562',
    800: '#7A5F46',
    900: '#4D3C2C',
    DEFAULT: '#E1CAB3',
  },

  // Accent — deeper brown variant (sale banners, promo highlights).
  // Matches web. Discount badges are still RED (`palette.error`) so
  // sale info stays distinct from the brand brown.
  accent: {
    light: '#C8794B',
    DEFAULT: '#AB6639',
    dark: '#8B532E',
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
  primary: palette.primary.DEFAULT,        // #AE6F4C (matches web)
  primaryLight: palette.primary[400],      // #B87447
  primaryDark: palette.primary[700],       // #8B532E
  primarySoft: palette.primary[50],        // #F7EEE8
  primaryMuted: palette.primary[100],      // #EFDDD1
  secondary: palette.secondary.DEFAULT,
  secondaryLight: palette.secondary[200],
  secondaryDark: palette.secondary[600],
  secondarySoft: palette.secondary[50],
  accent: palette.accent.DEFAULT,
  accentLight: palette.accent.light,
  accentDark: palette.accent.dark,

  // Call-to-action alias — kept for backward compat with code that used
  // `colors.cta`. Identical to `colors.primary` so nothing looks off-brand.
  cta: palette.primary.DEFAULT,            // #AE6F4C
  ctaDark: palette.primary[700],
  ctaLight: palette.primary[400],

  // Warm tint scale — use as soft card backgrounds, chip backgrounds,
  // icon-wells, etc. They're all lighter shades of the primary.
  tintSoft: palette.primary[50],           // #F7EEE8
  tintMid: palette.primary[100],           // #EFDDD1
  tintStrong: palette.primary[200],        // #DFBBA3

  // Surfaces
  background: '#FBFAF5',
  surface: palette.white,
  surfaceAlt: palette.neutral[50],
  surfaceElevated: palette.white,
  card: palette.white,
  border: '#E5E0D4',
  divider: palette.neutral[200],

  // Text — globally bumped DARKER so nothing in the UI reads as pale.
  // The hierarchy still exists (primary > secondary > tertiary > muted)
  // but the bottom rungs are now well above the legibility floor on
  // both light and warm-cream backgrounds.
  textPrimary: palette.neutral[800],       // #161612 — near-black with warmth
  textSecondary: palette.neutral[700],     // #24241F — darker than before (was 600)
  textTertiary: palette.neutral[600],      // #3E3D37 — was #555550, now matches old secondary
  textMuted: palette.neutral[500],         // #555550 — was #8A8A80 pale grey, now solidly readable
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
  pressed: palette.primary[100],           // #EFDDD1 — warm press wash
  focus: palette.primary.DEFAULT,          // #AE6F4C — input focus border / cursor
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
    '#F7EEE8',          // matches new primary[50]
    '#EFDDD1',          // matches new primary[100]
    '#F5EFE7',          // matches new secondary[100]
    '#EBE0CF',          // matches new secondary[200]
    '#DFBBA3',          // matches new primary[200]
    '#FAF7F3',          // matches new secondary[50]
  ],

  // Raw palette for special cases
  palette,
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
};

export type Colors = typeof colors;
