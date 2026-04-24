import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/**
 * Micro-interaction: scales a pressable down slightly on press-in, springs
 * back on press-out. Give the returned `style` to an Animated.View and wire
 * the returned `onPressIn` / `onPressOut` into a Pressable.
 */
export function usePressScale(depressed = 0.96) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withTiming(depressed, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [depressed, scale]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    });
  }, [scale]);

  return { style, onPressIn, onPressOut };
}
