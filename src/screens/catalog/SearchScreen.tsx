import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { catalogService } from '../../api/services';
import { EmptyState, Skeleton, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ProductCard } from '../../components/ProductCard';
import { colors } from '../../theme/colors';
import { radius, shadows, spacing } from '../../theme/spacing';
import { fonts, fontSizes, fontWeights } from '../../theme/typography';
import { STORAGE_KEYS } from '../../constants/storage';
import { toArray } from '../../utils/format';
import { hasProductImage } from '../../utils/image';
import type { Product } from '../../types';

const RECENT_LIMIT = 10;

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES)
      .then(raw => {
        if (raw) setRecents(JSON.parse(raw));
      })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    setLoading(true);
    catalogService
      .search(debounced)
      .then(r => setResults(toArray<Product>(r).filter(hasProductImage)))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  const addToRecents = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recents.filter(r => r.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      RECENT_LIMIT,
    );
    setRecents(next);
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(next));
  };

  const clearRecents = async () => {
    setRecents([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
  };

  return (
    <Container edges={['top']}>
      {/* Sticky search bar — lives outside the scrollable content */}
      <View style={styles.stickyBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.back}
          android_ripple={{ color: colors.pressed, borderless: true, radius: 22 }}
        >
          <Icon name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <View
          style={[
            styles.searchInput,
            {
              borderColor: isFocused ? colors.primary : colors.border,
              borderWidth: isFocused ? 1.5 : 1,
            },
          ]}
        >
          <Icon name="search" size={18} color={colors.primary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={() => addToRecents(query)}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <Icon name="x" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!debounced ? (
        <View style={styles.content}>
          {recents.length > 0 ? (
            <>
              <View style={styles.recentHeader}>
                <Text variant="label" color={colors.textSecondary}>
                  Recent searches
                </Text>
                <Pressable onPress={clearRecents} hitSlop={6}>
                  <Text variant="caption" color={colors.primary} weight="700">
                    Clear
                  </Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {recents.map(r => (
                  <Pressable key={r} onPress={() => setQuery(r)} style={styles.chip}>
                    <Icon name="clock" size={12} color={colors.textTertiary} />
                    <Text
                      variant="bodySmall"
                      color={colors.textPrimary}
                      style={{ marginLeft: 4 }}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <EmptyState
              icon="search"
              title="What are you looking for?"
              subtitle="Try 'turmeric powder', 'organic rice', or browse categories."
            />
          )}
        </View>
      ) : loading ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              height={220}
              width="48%"
              style={{ marginBottom: spacing.base, borderRadius: radius.lg }}
            />
          ))}
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No results"
          subtitle={`Nothing matched "${debounced}". Try a different keyword.`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p, i) => `sr-${p.id ?? p.productId ?? i}`}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ gap: spacing.base }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.base }} />}
          ListHeaderComponent={
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {results.length} results for "{debounced}"
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard
                product={item}
                onPress={() => {
                  addToRecents(debounced);
                  navigation.navigate('ProductDetail', {
                    productId: (item.id || item.productId)!,
                  });
                }}
              />
            </View>
          )}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  // Sticky bar lifts above the list with a shadow + white surface so it
  // reads as "floating" over scrolling content below.
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    ...shadows.sm,
    zIndex: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    padding: 0,
  },
  content: { flex: 1, padding: spacing.base },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.neutral[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
});
