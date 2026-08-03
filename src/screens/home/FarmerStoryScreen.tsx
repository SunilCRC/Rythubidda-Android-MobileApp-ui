import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { homeContentService } from '../../api/services';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import type { TodaysFarmer } from '../../types';

/**
 * Full farmer story page — opened from the "Know His Story →" button
 * on the hero overlay. The overlay only carries the short fields, so
 * this screen re-fetches /farmers/{id} for the FULL story text and
 * falls back to what it was handed if the network is slow/offline.
 */
export const FarmerStoryScreen: React.FC = () => {
  const route = useRoute<any>();
  const passed: TodaysFarmer = route.params?.farmer;

  const detail = useQuery({
    queryKey: ['farmerDetail', passed?.id],
    queryFn: () => homeContentService.getFarmerDetail(passed.id),
    enabled: !!passed?.id,
    staleTime: 5 * 60 * 1000,
  });

  const farmer = detail.data ?? passed;
  if (!farmer) {
    return (
      <Container edges={['top']}>
        <ScreenHeader title="Our Farmer" />
      </Container>
    );
  }

  const days = farmer.harvestedDaysAgo ?? 0;
  const story = (farmer.storyFull || farmer.storyShort || '').trim();
  const paragraphs = story.split(/\n+/).filter(p => p.trim().length > 0);

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Meet Our Farmer" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity block */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 44, includeFontPadding: false }}>🧑‍🌾</Text>
          </View>
          <Text variant="h3" weight="800" color={colors.primaryDark} align="center">
            {farmer.name}
          </Text>
          {farmer.location ? (
            <Text variant="bodySmall" color={colors.textMuted} align="center" style={{ marginTop: 2 }}>
              📍 {farmer.location}
            </Text>
          ) : null}

          <View style={styles.chips}>
            {farmer.cropSpecialty ? (
              <View style={styles.chip}>
                <Text variant="caption" weight="700" color={colors.primaryDark}>
                  🌾 {farmer.cropSpecialty}
                </Text>
              </View>
            ) : null}
            {farmer.yearsFarming && farmer.yearsFarming > 0 ? (
              <View style={styles.chip}>
                <Text variant="caption" weight="700" color={colors.primaryDark}>
                  🚜 {farmer.yearsFarming}+ years farming
                </Text>
              </View>
            ) : null}
            <View style={styles.chip}>
              <Text variant="caption" weight="700" color={colors.primaryDark}>
                🧺 {days > 0 ? `Harvested ${days} day${days === 1 ? '' : 's'} ago` : 'Freshly harvested'}
              </Text>
            </View>
          </View>
        </View>

        {/* Story */}
        <View style={styles.storyCard}>
          <Text variant="body" weight="800" color={colors.textPrimary} style={{ marginBottom: spacing.sm }}>
            His Story
          </Text>
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <Text
                key={i}
                variant="bodySmall"
                color={colors.textSecondary}
                style={styles.paragraph}
              >
                {p.trim()}
              </Text>
            ))
          ) : (
            <Text variant="bodySmall" color={colors.textTertiary}>
              {detail.isLoading ? 'Loading story…' : 'Story coming soon.'}
            </Text>
          )}
        </View>

        <Text
          variant="caption"
          weight="700"
          color={colors.textTertiary}
          align="center"
          style={{ paddingVertical: spacing.lg }}
        >
          🌾  Farm-fresh, farmer-first  🌾
        </Text>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.tintMid,
    borderWidth: 2.5,
    borderColor: colors.tintStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chip: {
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintStrong,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  storyCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    ...shadows.sm,
  },
  paragraph: { lineHeight: 20, marginBottom: spacing.sm },
});
