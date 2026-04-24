import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { APP_CONFIG } from '../../constants/config';

interface Props {
  title: string;
  path: string;
}

/**
 * Loads the corresponding page from the main website. Saves us duplicating
 * policy content here; the web copy is the source of truth.
 */
export const WebViewScreen: React.FC<Props> = ({ title, path }) => {
  const url = `${APP_CONFIG.WEB_URL}${path}`;
  return (
    <Container edges={['top']}>
      <ScreenHeader title={title} />
      <WebView
        source={{ uri: url }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        style={{ backgroundColor: colors.background }}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
