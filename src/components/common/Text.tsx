import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { familyFor, textVariants } from '../../theme/typography';

type Variant = keyof typeof textVariants;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
  style?: TextStyle | TextStyle[];
}

export const Text: React.FC<Props> = ({
  variant = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}) => {
  const variantStyle = textVariants[variant];
  // Brand fonts ship as one FILE per weight (see typography.ts), so
  // the effective weight picks the font FAMILY: Baloo 2 for headings,
  // Nunito Sans for everything else. fontWeight is then forced to
  // 'normal' so Android never synthetically re-bolds a bold file.
  const effectiveWeight = weight ?? variantStyle.fontWeight;
  const isHeading = variant.startsWith('h');
  const composed: TextStyle = {
    ...variantStyle,
    fontFamily: familyFor(effectiveWeight, isHeading),
    fontWeight: 'normal',
    color: color ?? colors.textPrimary,
    ...(align ? { textAlign: align } : {}),
  };
  return (
    <RNText {...rest} style={[composed, style as TextStyle]}>
      {children}
    </RNText>
  );
};
