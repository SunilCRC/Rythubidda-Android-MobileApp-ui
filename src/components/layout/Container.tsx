import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

interface Props {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle | ViewStyle[];
  background?: string;
}

export const Container: React.FC<Props> = ({
  children,
  edges = ['top', 'bottom'],
  style,
  background,
}) => (
  <SafeAreaView
    edges={edges}
    style={[
      styles.safe,
      { backgroundColor: background ?? colors.background },
      style as ViewStyle,
    ]}
  >
    <View style={styles.inner}>{children}</View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1 },
});
