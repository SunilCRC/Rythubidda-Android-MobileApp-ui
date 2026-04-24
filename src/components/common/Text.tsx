import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { textVariants } from '../../theme/typography';

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
  const composed: TextStyle = {
    ...variantStyle,
    color: color ?? colors.textPrimary,
    ...(align ? { textAlign: align } : {}),
    ...(weight ? { fontWeight: weight } : {}),
  };
  return (
    <RNText {...rest} style={[composed, style as TextStyle]}>
      {children}
    </RNText>
  );
};
