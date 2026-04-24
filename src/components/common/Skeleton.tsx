import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Shimmer loading placeholder with a sliding gradient highlight
 * (matches the pattern used by Zepto, Blinkit, etc.).
 */
export const Skeleton: React.FC<Props> = ({
  width = '100%',
  height = 16,
  borderRadius = radius.md,
  style,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: -180 + progress.value * 360,
      },
    ],
  }));

  return (
    <View
      style={[
        styles.base,
        { width, height, borderRadius } as any,
        style,
      ]}
    >
      <AnimatedGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.65)',
          'rgba(255,255,255,0)',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.highlight, highlightStyle]}
      />
    </View>
  );
};

export const SkeletonRow: React.FC<{
  count?: number;
  height?: number;
  gap?: number;
}> = ({ count = 3, height = 16, gap = 8 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton
        key={i}
        height={height}
        width={i === count - 1 ? '60%' : '100%'}
        style={{ marginBottom: gap }}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.shimmerBase,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 180,
  },
});
