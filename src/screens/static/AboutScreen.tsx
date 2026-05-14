import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { Card, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';

/**
 * Mirrors `Rythubidda-UI/src/pages/About.tsx`. Sections:
 *
 *   1. Hero — brand title + tagline + 3 stat pills
 *   2. Who We Are — 3-paragraph story
 *   3. What We Offer — bulleted product range
 *   4. Our Commitment — 4 icon cards (Products / Promise / Vision / Mission)
 *   5. Why Choose Us — 4 supporting points
 *
 * All copy is identical to the website. Translating Tailwind layouts into
 * native React Native styles, with brand-color gradients for the hero
 * and the icon-card accents.
 */

const FOCUS_CARDS: Array<{ label: string; value: string }> = [
  { label: 'Our Focus', value: 'Good quality at the right price' },
  { label: 'Product Range', value: 'Regular & natural staples for every home' },
  {
    label: 'Farmer Connect',
    value: 'Direct procurement for freshness & fairness',
  },
];

const WHO_WE_ARE = [
  'Rythubidda Cereals Private Limited is a growing food brand committed to delivering clean, quality, and affordable food products to every household. We offer both regular and natural products, ensuring that every customer has access to the choice that suits their lifestyle and preferences.',
  'We purchase most of our products directly from farmers and store them in a hygienic and well-maintained facility before processing and packing. This helps us maintain freshness, purity, and consistent quality in every batch.',
  'At Rythubidda, our focus is simple: Good quality at the right price. Whether it is everyday staples or natural alternatives, we work to make healthy eating accessible, trustworthy, and affordable.',
];

const OFFERINGS: string[] = [
  'Regular & Natural Rice',
  'Pulses and Grains',
  'Millets',
  'Wheat & Pulse Flours',
  'Household staples at competitive prices',
];

const COMMITMENT: Array<{
  icon: string;
  title: string;
  desc: string;
  gradient: [string, string];
}> = [
  {
    icon: 'award',
    title: 'Our Products',
    desc: 'Products suitable for daily family consumption',
    gradient: colors.gradients.primary,
  },
  {
    icon: 'target',
    title: 'Our Promise',
    desc:
      'Consistent quality, fair pricing, trust, transparency, and timely service',
    gradient: colors.gradients.secondary,
  },
  {
    icon: 'users',
    title: 'Our Vision',
    desc:
      'To become a trusted household name across India by providing premium yet affordable food products that support a healthy and balanced lifestyle',
    gradient: colors.gradients.accent,
  },
  {
    icon: 'heart',
    title: 'Our Mission',
    desc:
      'To deliver clean, nutritious, and value-driven food products while continuously expanding our offerings with modern grading and processing technology',
    gradient: colors.gradients.warmth,
  },
];

const WHY_CHOOSE: Array<{ title: string; desc: string }> = [
  {
    title: 'Fair Pricing',
    desc:
      'Fair pricing without compromising standards — we make healthy eating affordable for everyday families.',
  },
  {
    title: 'Quality & Hygiene',
    desc:
      'Strict quality checks, hygienic storage, and modern processing ensure consistent product quality and purity.',
  },
  {
    title: 'Direct Sourcing',
    desc:
      'We procure directly from farmers to support fair livelihoods and bring fresher, more reliable supplies to your home.',
  },
  {
    title: 'Trust & Service',
    desc:
      'Trust, transparency, and timely service through clear practices, reliable delivery, and responsive customer care.',
  },
];

export const AboutScreen: React.FC = () => (
  <Container edges={['top']}>
    <ScreenHeader title="About" />
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={colors.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text
          variant="caption"
          weight="800"
          color="rgba(255,255,255,0.85)"
          style={styles.heroEyebrow}
        >
          ABOUT US
        </Text>
        <Text
          variant="h3"
          weight="800"
          color={colors.white}
          style={{ marginTop: spacing.xs }}
        >
          Rythubidda Cereals Private Limited
        </Text>
        <Text
          variant="body"
          weight="600"
          color="rgba(255,255,255,0.95)"
          style={{ marginTop: spacing.sm, lineHeight: 22 }}
        >
          Delivering clean, quality, and affordable food products to every
          household, with a strong focus on farmer-first sourcing and everyday
          accessibility.
        </Text>

        <View style={styles.focusCards}>
          {FOCUS_CARDS.map(f => (
            <View key={f.label} style={styles.focusCard}>
              <Text
                variant="caption"
                weight="700"
                color="rgba(255,255,255,0.75)"
                style={styles.focusLabel}
              >
                {f.label}
              </Text>
              <Text variant="bodyBold" weight="800" color={colors.white}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Who We Are ─────────────────────────────────────────────── */}
      <SectionTitle icon="users">Who We Are</SectionTitle>
      <Card>
        {WHO_WE_ARE.map((p, i) => (
          <Text
            key={i}
            variant="body"
            weight="600"
            color={colors.textPrimary}
            style={{
              marginTop: i === 0 ? 0 : spacing.sm,
              lineHeight: 22,
            }}
          >
            {p}
          </Text>
        ))}
      </Card>

      {/* ── What We Offer ──────────────────────────────────────────── */}
      <SectionTitle icon="shopping-bag">What We Offer</SectionTitle>
      <Card>
        <Text
          variant="bodySmall"
          weight="600"
          color={colors.textSecondary}
          style={{ marginBottom: spacing.sm }}
        >
          A carefully curated range of staples and natural products designed
          for everyday family consumption.
        </Text>
        {OFFERINGS.map(item => (
          <View key={item} style={styles.bullet}>
            <View style={styles.bulletDot} />
            <Text
              variant="bodyBold"
              weight="700"
              color={colors.textPrimary}
              style={{ flex: 1, marginLeft: spacing.sm }}
            >
              {item}
            </Text>
          </View>
        ))}
      </Card>

      {/* ── Our Commitment ─────────────────────────────────────────── */}
      <SectionTitle icon="award">Our Commitment</SectionTitle>
      <Text
        variant="bodySmall"
        weight="600"
        color={colors.textSecondary}
        style={{ marginTop: -spacing.xs, marginBottom: spacing.sm }}
      >
        Products, promise, vision, and mission — all centred around quality,
        trust, and affordability.
      </Text>
      {COMMITMENT.map(c => (
        <Card key={c.title} style={styles.commitmentCard}>
          <LinearGradient
            colors={c.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.commitmentIcon}
          >
            <Icon name={c.icon} size={22} color={colors.white} />
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: spacing.base }}>
            <Text variant="h6" weight="800" color={colors.textPrimary}>
              {c.title}
            </Text>
            <Text
              variant="bodySmall"
              weight="600"
              color={colors.textPrimary}
              style={{ marginTop: 4, lineHeight: 20 }}
            >
              {c.desc}
            </Text>
          </View>
        </Card>
      ))}

      {/* ── Why Choose Us ──────────────────────────────────────────── */}
      <SectionTitle icon="thumbs-up">Why Choose Us?</SectionTitle>
      <Text
        variant="bodySmall"
        weight="600"
        color={colors.textSecondary}
        style={{ marginTop: -spacing.xs, marginBottom: spacing.sm }}
      >
        A transparent, farmer-connected supply chain with uncompromising
        standards on quality and value.
      </Text>
      <Card>
        {WHY_CHOOSE.map((w, i) => (
          <View
            key={w.title}
            style={[
              styles.whyRow,
              i > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.divider,
                paddingTop: spacing.sm,
                marginTop: spacing.sm,
              },
            ]}
          >
            <View style={styles.whyIconWell}>
              <Icon name="check" size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text variant="bodyBold" weight="800" color={colors.textPrimary}>
                {w.title}
              </Text>
              <Text
                variant="bodySmall"
                weight="600"
                color={colors.textPrimary}
                style={{ marginTop: 2, lineHeight: 19 }}
              >
                {w.desc}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ height: spacing['2xl'] }} />
    </ScrollView>
  </Container>
);

// ─── Small reusable section header ────────────────────────────────────

const SectionTitle: React.FC<{
  icon: string;
  children: React.ReactNode;
}> = ({ icon, children }) => (
  <View style={styles.sectionTitleRow}>
    <View style={styles.sectionIcon}>
      <Icon name={icon} size={14} color={colors.primary} />
    </View>
    <Text variant="h5" weight="800" color={colors.textPrimary}>
      {children}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing.xl },

  // Hero
  hero: {
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  heroEyebrow: { letterSpacing: 2 },
  focusCards: { marginTop: spacing.lg, gap: spacing.sm },
  focusCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  focusLabel: {
    letterSpacing: 1,
    marginBottom: 2,
  },

  // Section title row
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  // Offerings bullet list
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Commitment cards
  commitmentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  commitmentIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  // Why-choose-us rows
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  whyIconWell: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tintSoft,
    borderWidth: 1,
    borderColor: colors.tintMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
