import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, shadows } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};

export { colors, typography, spacing, radius, shadows };
export type Theme = typeof theme;
