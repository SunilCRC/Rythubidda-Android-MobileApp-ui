import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { Text } from './Text';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: string;
}

/**
 * Expandable section with a bold heading + chevron.
 * Uses LayoutAnimation for a cheap, smooth open/close without
 * depending on reanimated for height transitions.
 */
export const AccordionItem: React.FC<Props> = ({
  title,
  defaultOpen = false,
  children,
  icon,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: 240,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setOpen(o => !o);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        style={styles.header}
        android_ripple={{ color: colors.pressed }}
      >
        {icon ? (
          <Icon
            name={icon}
            size={16}
            color={colors.primary}
            style={{ marginRight: spacing.sm }}
          />
        ) : null}
        <Text
          variant="bodyBold"
          weight="700"
          color={colors.textPrimary}
          style={{ flex: 1 }}
        >
          {title}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.primary}
        />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    minHeight: 52,
  },
  body: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.xs,
  },
});
