import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common';
import { BrandToast } from './src/components/feedback/BrandToast';
import { ConfirmHost } from './src/components/feedback/ConfirmHost';
import { colors } from './src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

/**
 * Brand toast renderer config — replaces the default
 * BaseToast/ErrorToast widgets from react-native-toast-message with our
 * own card (rounded, icon-well, soft shadow) defined in BrandToast.tsx.
 */
const toastConfig = {
  success: (props: any) => (
    <BrandToast variant="success" text1={props.text1} text2={props.text2} />
  ),
  error: (props: any) => (
    <BrandToast variant="error" text1={props.text1} text2={props.text2} />
  ),
  info: (props: any) => (
    <BrandToast variant="info" text1={props.text1} text2={props.text2} />
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
              {/* Brand confirm dialog — replaces native Alert.alert */}
              <ConfirmHost />
              {/* Toasts mount LAST so they overlay everything else */}
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
