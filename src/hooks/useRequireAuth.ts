import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useIsAuthenticated } from '../store';

/**
 * Returns a helper that, given an action, runs it if the user is authenticated.
 * Otherwise it opens the Auth modal.
 *
 * Example:
 *   const withAuth = useRequireAuth();
 *   <Button onPress={() => withAuth(() => addToCart(product))} />
 */
export function useRequireAuth() {
  const isAuth = useIsAuthenticated();
  const navigation = useNavigation<any>();

  const requireAuth = useCallback(
    (action?: () => void | Promise<void>) => {
      if (isAuth) {
        if (action) action();
        return true;
      }
      navigation.getParent()?.navigate('Auth', { screen: 'Login' }) ??
        navigation.navigate('Auth', { screen: 'Login' });
      return false;
    },
    [isAuth, navigation],
  );

  return requireAuth;
}
