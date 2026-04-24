import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';
import { Container } from './Container';
import { ScreenHeader } from './ScreenHeader';

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface Props {
  title: string;
  effectiveDate?: string;
  intro?: string;
  sections: PolicySection[];
}

/**
 * Shared layout for all static policy screens (Terms, Privacy, Refund, Shipping).
 * Renders native Text components with heading / paragraph / bullet variants
 * — no WebView, no network, loads instantly.
 */
export const PolicyLayout: React.FC<Props> = ({
  title,
  effectiveDate,
  intro,
  sections,
}) => (
  <Container edges={['top']}>
    <ScreenHeader title={title} />
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="h3" color={colors.primaryDark}>
        {title}
      </Text>
      {effectiveDate ? (
        <Text
          variant="caption"
          color={colors.textTertiary}
          style={styles.date}
        >
          Effective: {effectiveDate}
        </Text>
      ) : null}
      {intro ? (
        <Text
          variant="body"
          color={colors.textSecondary}
          style={styles.intro}
        >
          {intro}
        </Text>
      ) : null}
      {sections.map((section, i) => (
        <View key={`sec-${i}`} style={styles.section}>
          <Text variant="h5" color={colors.textPrimary} style={styles.heading}>
            {section.heading}
          </Text>
          {section.paragraphs?.map((p, j) => (
            <Text
              key={`p-${j}`}
              variant="body"
              color={colors.textPrimary}
              style={styles.paragraph}
            >
              {p}
            </Text>
          ))}
          {section.bullets?.map((b, j) => (
            <View key={`b-${j}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text
                variant="body"
                color={colors.textPrimary}
                style={styles.bulletText}
              >
                {b}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  </Container>
);

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  date: { marginTop: spacing.xs },
  intro: { marginTop: spacing.base, lineHeight: 22 },
  section: { marginTop: spacing.xl },
  heading: { marginBottom: spacing.sm },
  paragraph: { marginTop: spacing.sm, lineHeight: 22 },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 9,
    marginRight: spacing.sm,
  },
  bulletText: { flex: 1, lineHeight: 22 },
});
