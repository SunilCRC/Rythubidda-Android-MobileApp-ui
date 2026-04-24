import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common';
import { colors } from './src/theme/colors';
import { fonts } from './src/theme/typography';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: colors.success, backgroundColor: colors.surface }}
      text1Style={{ fontFamily: fonts.regular, fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
      text2Style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: colors.error, backgroundColor: colors.surface }}
      text1Style={{ fontFamily: fonts.regular, fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
      text2Style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: colors.info, backgroundColor: colors.surface }}
      text1Style={{ fontFamily: fonts.regular, fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
      text2Style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary }}
    />
  ),
};

const App: React.FC = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(colors.background);
      StatusBar.setBarStyle('dark-content');
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <View style={styles.root}>
              <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
                translucent={false}
              />
              <RootNavigator />
              <Toast config={toastConfig} topOffset={50} />
            </View>
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

export default App;
