import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { Text } from './Text';

interface Props {
  password: string;
  showChecklist?: boolean;
}

interface Rule {
  label: string;
  test: (s: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Minimum 8 characters', test: s => s.length >= 8 },
  { label: 'At least one uppercase letter', test: s => /[A-Z]/.test(s) },
  { label: 'At least one number', test: s => /\d/.test(s) },
  {
    label: 'At least one special character',
    test: s => /[^A-Za-z0-9]/.test(s),
  },
];

/**
 * Live password strength bar + requirement checklist.
 * Bar animates red → orange → green as more rules pass.
 * Each rule shows a check (green) when met, a cross (muted) when not.
 */
export const PasswordStrengthIndicator: React.FC<Props> = ({
  password,
  showChecklist = true,
}) => {
  const passed = useMemo(
    () => RULES.map(r => r.test(password)),
    [password],
  );
  const passedCount = passed.filter(Boolean).length;

  const strength = {
    label:
      password.length === 0
        ? ''
        : passedCount <= 1
        ? 'Weak'
        : passedCount <= 2
        ? 'Fair'
        : passedCount <= 3
        ? 'Good'
        : 'Strong',
    color:
      passedCount <= 1
        ? colors.error
        : passedCount <= 2
        ? colors.warning
        : passedCount <= 3
        ? colors.secondaryDark
        : colors.success,
    fillPercent: password.length === 0 ? 0 : (passedCount / RULES.length) * 100,
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: strength.color,
              width: `${strength.fillPercent}%`,
            },
          ]}
        />
      </View>
      {strength.label ? (
        <Text
          variant="caption"
          color={strength.color}
          weight="700"
          style={styles.strengthLabel}
        >
          {strength.label}
        </Text>
      ) : null}
      {showChecklist ? (
        <View style={styles.checklist}>
          {RULES.map((r, i) => (
            <View key={r.label} style={styles.ruleRow}>
              <View
                style={[
                  styles.ruleIcon,
                  {
                    backgroundColor: passed[i]
                      ? colors.successSoft
                      : colors.palette.neutral[100],
                  },
                ]}
              >
                <Icon
                  name={passed[i] ? 'check' : 'x'}
                  size={12}
                  color={passed[i] ? colors.success : colors.textTertiary}
                />
              </View>
              <Text
                variant="bodySmall"
                weight="600"
                color={passed[i] ? colors.textPrimary : colors.textSecondary}
                style={{ marginLeft: spacing.sm }}
              >
                {r.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: -spacing.sm, marginBottom: spacing.sm },
  barTrack: {
    height: 6,
    backgroundColor: colors.palette.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  barFill: { height: '100%', borderRadius: radius.full },
  strengthLabel: { marginTop: 4, alignSelf: 'flex-end' },
  checklist: { marginTop: spacing.sm, gap: 6 },
  ruleRow: { flexDirection: 'row', alignItems: 'center' },
  ruleIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
