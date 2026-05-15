import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Text } from './common/Text';
import { ErrorBoundary } from './common/ErrorBoundary';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';

/**
 * Map picker built on `react-native-maps`.
 *
 * Behaviour mirrors Zepto / Swiggy / Blinkit:
 *
 *   • The map itself is fully pannable + zoomable.
 *   • A pin floats at the visual centre of the map (CSS overlay, NOT a
 *     real Marker) so the user pans the *map under the pin* — much easier
 *     than dragging a tiny marker.
 *   • The pin lifts ~6px while the user is panning ("dragging" feel),
 *     and drops back down once the camera settles.
 *   • `onCoordinateChange` fires once the camera comes to rest on a new
 *     centre — we throttle to user gestures only, not programmatic
 *     animations triggered by the parent.
 *   • Programmatic re-centres (parent passes new lat/lng after GPS
 *     detect / autocomplete pick) are smoothly animated, not snapped.
 *   • Optional "locate me" FAB in the bottom-right.
 *
 * Provider:
 *   Android → forced Google. iOS → default (Apple Maps) until iOS
 *   bundle id + key is wired up.
 */

interface Props {
  latitude: number;
  longitude: number;
  /** Fires once the map camera settles on a new centre after a user pan. */
  onCoordinateChange?: (coords: { latitude: number; longitude: number }) => void;
  /** Set false to disable panning (read-only preview). Default true. */
  draggable?: boolean;
  /** Override default 220px height. */
  height?: number;
  style?: ViewStyle;
  /** Show a small "use my location" floating button bottom-right. */
  showLocateMe?: boolean;
  onLocateMe?: () => void;
  /** Render a subtle "Updating…" pill — usually whilst reverse-geocoding. */
  loading?: boolean;
}

interface MapsModule {
  default: any;
  Marker: any;
  PROVIDER_GOOGLE?: any;
}

function loadMaps(): MapsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-maps') as MapsModule;
  } catch {
    return null;
  }
}

const MapFallback: React.FC<{ height: number; style?: ViewStyle }> = ({
  height,
  style,
}) => (
  <View style={[styles.fallback, { height }, style]}>
    <Icon name="map-pin" size={32} color={colors.primary} />
    <Text
      variant="caption"
      weight="600"
      color={colors.textSecondary}
      align="center"
      style={{ marginTop: spacing.xs, paddingHorizontal: spacing.base }}
    >
      Map preview unavailable on this device.{'\n'}
      Your detected location is still ready to use below.
    </Text>
  </View>
);

const InnerMap: React.FC<Props> = ({
  latitude,
  longitude,
  onCoordinateChange,
  draggable = true,
  height = 220,
  style,
  showLocateMe,
  onLocateMe,
  loading,
}) => {
  const maps = loadMaps();
  const mapRef = useRef<any>(null);

  // We track the last coords WE emitted so the parent re-rendering with
  // those exact values doesn't trigger a redundant animateToRegion (which
  // would otherwise create a jitter loop while panning).
  const lastEmittedRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Pin lift animation while the camera is moving. Two animated values:
  //   • liftAnim   — drives the pin body's vertical translate (rises while
  //                  panning, springs back to ground on settle).
  //   • shadowAnim — drives the ground shadow's scale + opacity so it
  //                  shrinks/fades as the pin "rises off the floor".
  const liftAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (isMoving) {
      // Quick lift on the way up — instant feedback as the user pans.
      Animated.parallel([
        Animated.timing(liftAnim, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Spring back down on the way home — the little bounce sells the
      // "drop into place" feel from Zepto/Swiggy.
      Animated.parallel([
        Animated.spring(liftAnim, {
          toValue: 0,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isMoving, liftAnim, shadowAnim]);

  // When the parent passes new coords (e.g. fresh GPS fix or autocomplete
  // pick), animate the camera there. Skip if the coords are essentially
  // the same as what we just emitted ourselves (drag → emit → re-render
  // → useEffect fires → would re-snap and break the pan).
  useEffect(() => {
    if (!mapRef.current) return;
    const last = lastEmittedRef.current;
    if (
      last &&
      Math.abs(last.latitude - latitude) < 0.00001 &&
      Math.abs(last.longitude - longitude) < 0.00001
    ) {
      return;
    }
    mapRef.current.animateToRegion?.(
      {
        latitude,
        longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      450,
    );
  }, [latitude, longitude]);

  if (!maps) {
    return <MapFallback height={height} style={style} />;
  }

  const MapView: any = maps.default ?? (maps as any).MapView ?? null;
  const PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  if (!MapView) {
    return <MapFallback height={height} style={style} />;
  }

  const initialRegion = {
    latitude,
    longitude,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };

  // The pin is composed of: a filled circular HEAD (PIN_HEAD), a small
  // triangular TAIL underneath that points DOWN, and a separate ground
  // SHADOW. The pin's tip (the bottom of the tail) must sit at the
  // geometric centre of the map, so we translate the floating pin up by
  // its full visual height (head + tail). On drag we lift it another
  // ~14px, exactly like Zepto / Swiggy.
  const pinTranslateY = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(PIN_HEAD + PIN_TAIL_H), -(PIN_HEAD + PIN_TAIL_H + 14)],
  });
  const shadowScale = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });
  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.32, 0.16],
  });

  return (
    <View style={[styles.wrap, { height }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        scrollEnabled={draggable}
        zoomEnabled={draggable}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsCompass={false}
        loadingEnabled
        loadingBackgroundColor={colors.tintSoft}
        loadingIndicatorColor={colors.primary}
        onRegionChange={() => {
          if (!isMoving) setIsMoving(true);
        }}
        onRegionChangeComplete={(region: any, details?: { isGesture?: boolean }) => {
          setIsMoving(false);
          // Skip the initial settle (no gesture) and any programmatic
          // animations we trigger ourselves. `details.isGesture` is
          // available in react-native-maps ≥ 1.10. If the field is
          // missing, fall back to "treat all settles as user gestures"
          // — slightly less precise but safer than dropping legit pans.
          const isUser = details?.isGesture ?? true;
          if (!isUser) return;
          if (
            typeof region?.latitude !== 'number' ||
            typeof region?.longitude !== 'number'
          ) {
            return;
          }
          lastEmittedRef.current = {
            latitude: region.latitude,
            longitude: region.longitude,
          };
          onCoordinateChange?.({
            latitude: region.latitude,
            longitude: region.longitude,
          });
        }}
      />

      {/* ── Center pin overlay (Zepto / Swiggy style) ──────────────── */}
      {/* Built from primitives — a filled circular head with a white   */}
      {/* inner ring + a downward-pointing triangular tail. Below it, a */}
      {/* separate elliptical "ground shadow" that shrinks + fades when */}
      {/* the pin lifts off (during pan). pointerEvents="none" so the   */}
      {/* whole composition never steals touches from the map.          */}
      <View pointerEvents="none" style={styles.pinAnchor}>
        {/* Ground shadow — sits AT the anchor point (the pin tip's     */}
        {/* resting position). Doesn't move with the pin lift.          */}
        <Animated.View
          style={[
            styles.groundShadow,
            { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }] },
          ]}
        />

        {/* The floating pin — head + tail. Translated upwards so the   */}
        {/* tail TIP rests on the anchor point (geometric centre).      */}
        <Animated.View
          style={[
            styles.pinFloat,
            { transform: [{ translateY: pinTranslateY }] },
          ]}
        >
          <View style={styles.pinHead}>
            <View style={styles.pinDotInner} />
          </View>
          <View style={styles.pinTail} />
        </Animated.View>
      </View>

      {/* "Drag the map" hint — fades while user is moving */}
      {draggable ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hintPill,
            { opacity: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
        >
          <Icon name="move" size={12} color={colors.white} />
          <Text variant="caption" weight="700" color={colors.white} style={{ marginLeft: 4 }}>
            Move map to set location
          </Text>
        </Animated.View>
      ) : null}

      {loading ? (
        <View pointerEvents="none" style={styles.loadingPill}>
          <Text variant="caption" weight="700" color={colors.white}>
            Updating…
          </Text>
        </View>
      ) : null}

      {showLocateMe && onLocateMe ? (
        <Pressable
          onPress={onLocateMe}
          android_ripple={{ color: colors.pressed, borderless: true, radius: 24 }}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          hitSlop={6}
        >
          <Icon name="navigation" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
};

export const LocationMapPreview: React.FC<Props> = props => (
  <ErrorBoundary
    fallback={() => (
      <MapFallback height={props.height ?? 220} style={props.style} />
    )}
  >
    <InnerMap {...props} />
  </ErrorBoundary>
);

// Pin geometry constants. Used both in the styles below AND in the
// translate calculation upstream so the tip always lands at centre.
const PIN_HEAD = 38;
const PIN_TAIL_H = 12;
const PIN_TAIL_W = 14;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  fallback: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
  },

  // Zero-size anchor positioned at the geometric centre of the map.
  // All pin pieces (shadow + floating head/tail) are positioned relative
  // to this point so the pin's TIP — not its centre of mass — marks the
  // selected coordinate, exactly as Zepto / Swiggy do.
  pinAnchor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Soft elliptical "ground shadow" sitting AT the anchor. It doesn't
  // lift with the pin; instead it shrinks + fades while the pin is
  // airborne, then returns to full size on settle.
  groundShadow: {
    position: 'absolute',
    width: 26,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
    // Anchor box is a zero-sized point — push the shadow down by half
    // its own height so it sits centred just under the resting tip.
    transform: [{ translateY: 2 }],
  },

  // The "floating" pin — head circle on top of a downward-pointing
  // triangular tail. Translated upward in the render so the tail's
  // pointed bottom hits the anchor point.
  pinFloat: {
    alignItems: 'center',
    // Drop shadow on the pin itself adds dimensional depth.
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  pinHead: {
    width: PIN_HEAD,
    height: PIN_HEAD,
    borderRadius: PIN_HEAD / 2,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  // Triangular tail — created with the classic CSS-pin border trick.
  // borderTopColor is the pin colour; left + right borders are
  // transparent → produces a downward-pointing triangle.
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: PIN_TAIL_W / 2,
    borderRightWidth: PIN_TAIL_W / 2,
    borderTopWidth: PIN_TAIL_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    // Tuck the tail right under the head with a slight overlap so the
    // junction reads as one continuous shape.
    marginTop: -2,
  },

  hintPill: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,18,0.78)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  loadingPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(20,20,18,0.78)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },

  fab: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
});
