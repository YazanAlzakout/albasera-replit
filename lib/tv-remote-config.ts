import { Platform } from 'react-native';
import { Directions, SpatialNavigation } from 'react-tv-space-navigation';

let configured = false;

export function configureTVRemoteControl() {
  if (!Platform.isTV || configured) return;
  configured = true;

  // On web (browser-based TV): use keyboard-driven SpatialNavigation
  if (Platform.OS === 'web') {
    SpatialNavigation.configureRemoteControl({
      remoteControlSubscriber: (callback) => {
        const mapping: Record<string, string> = {
          ArrowRight: Directions.RIGHT,
          ArrowLeft: Directions.LEFT,
          ArrowUp: Directions.UP,
          ArrowDown: Directions.DOWN,
          Enter: Directions.ENTER,
          ' ': Directions.ENTER,
        };

        const handler = (e: KeyboardEvent) => {
          if ((e.key === 'Escape' || e.key === 'Backspace') && !e.repeat) {
            e.preventDefault();
            window.history.back();
            return;
          }
          const direction = mapping[e.key];
          if (direction) {
            e.preventDefault();
            callback(direction as any);
          }
        };

        window.addEventListener('keydown', handler);
        return handler;
      },
      remoteControlUnsubscriber: (handler) => {
        window.removeEventListener('keydown', handler as any);
      },
    });
    return;
  }

  // Android TV / tvOS — native Pressable focus system handles D-pad navigation.
  // SpatialNavigation is NOT used here; TVEventHandler is unreliable in Expo.
  // No-op: native focusable Pressable components get focus/blur from the OS.
}
