import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

/** "2 days 5 hrs left" / "5 hrs 12 min left" / "12 min 05 sec left". */
export function formatTimeLeft(msLeft: number): string {
  if (msLeft <= 0) return 'Expired';
  const total = Math.floor(msLeft / 1000);
  const days = Math.floor(total / 86400);
  const hrs = Math.floor((total % 86400) / 3600);
  const min = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ${hrs} hr${hrs === 1 ? '' : 's'} left`;
  if (hrs >= 1) return `${hrs} hr${hrs === 1 ? '' : 's'} ${pad(min)} min left`;
  return `${min} min ${pad(sec)} sec left`;
}

/**
 * Live "time left" for a coupon. `expiresAtMs` is a DEVICE-clock timestamp
 * computed when the coupon list arrived (now + the server's secondsLeft), so
 * the countdown stays right even if the phone's clock is wrong.
 * Ticks every second in the last hour, every 30 s before that; red in the
 * last 24 hours.
 */
export const CouponTimeLeft: React.FC<{ expiresAtMs?: number | null }> = ({ expiresAtMs }) => {
  const [now, setNow] = useState(() => Date.now());
  const msLeft = expiresAtMs ? expiresAtMs - now : 0;
  const fast = msLeft > 0 && msLeft < 3_600_000;

  useEffect(() => {
    if (!expiresAtMs) return;
    const t = setInterval(() => setNow(Date.now()), fast ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [expiresAtMs, fast]);

  if (!expiresAtMs) return null;
  const urgent = msLeft < 86_400_000;
  return (
    <View style={[styles.pill, urgent ? styles.urgent : styles.normal]}>
      <Text variant="caption" weight="800" color={urgent ? colors.error : colors.warning}>
        {formatTimeLeft(msLeft)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  normal: { backgroundColor: colors.warningSoft },
  urgent: { backgroundColor: colors.warningSoft },
});
