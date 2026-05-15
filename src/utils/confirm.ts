/**
 * Imperative API for showing the brand-themed confirm dialog.
 *
 * Usage anywhere (including outside React render):
 *
 *   const ok = await confirm({
 *     title: 'Delete address?',
 *     message: 'This cannot be undone.',
 *     confirmText: 'Delete',
 *     destructive: true,
 *   });
 *   if (ok) doTheThing();
 *
 * Replaces every `Alert.alert(...)` call across the app — those use the
 * native OS dialog which looks completely off-brand. The brand dialog
 * (see ConfirmHost.tsx) is themed to match cards/headers everywhere
 * else.
 *
 * Internals: a single subscriber pattern. ConfirmHost registers itself
 * on mount; `confirm()` calls the registered subscriber to push state.
 * The host renders the modal and calls `resolve(boolean)` on button
 * press.
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Renders the confirm button in red (delete / logout flows). */
  destructive?: boolean;
  /** Override the icon shown at the top of the dialog. Default: question mark, or warning for destructive. */
  icon?: string;
  /** Hide the Cancel button — useful for "OK, got it" single-action notices. */
  singleAction?: boolean;
}

export interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

type Subscriber = (req: ConfirmRequest | null) => void;

let activeSubscriber: Subscriber | null = null;

/**
 * Show a confirm dialog. Resolves true when the user taps Confirm,
 * false on Cancel / backdrop / Android back button.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    if (!activeSubscriber) {
      // Host not mounted (only possible during early app boot before
      // ConfirmHost mounts). Resolve false — caller should never block
      // on a popup that never appears.
      // eslint-disable-next-line no-console
      if (__DEV__) console.warn('[confirm] no host registered — resolving false');
      resolve(false);
      return;
    }
    activeSubscriber({ options, resolve });
  });
}

/** Internal — wired up by ConfirmHost's useEffect. */
export function _registerConfirmSubscriber(sub: Subscriber | null): void {
  activeSubscriber = sub;
}
