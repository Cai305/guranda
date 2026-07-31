import { createNavigationContainerRef } from '@react-navigation/native';

// Lets components outside the navigation tree (e.g. the global AI floating
// orb) navigate without needing a `navigation` prop threaded down to them.
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
