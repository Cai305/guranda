import * as ExpoLinking from 'expo-linking';
import { navigate } from '../navigation/navigationRef';

// The far end of the OAuth round-trip started by ConnectedAppsScreen: the
// system browser finishes at this API's own /integrations/:provider/
// callback, which 302s to lifeos://integrations/callback?provider=X&status=
// success|error — the OS hands that URL back to the app here. No React
// Navigation `linking` config exists app-wide, so this is a small dedicated
// listener rather than wiring a new one in for just this one path.
let registered = false;

function handleUrl(url: string) {
  const { path, queryParams } = ExpoLinking.parse(url);
  if (path !== '/integrations/callback' && path !== 'integrations/callback') return;
  navigate('ConnectedApps', {
    provider: queryParams?.provider,
    status: queryParams?.status,
    message: queryParams?.message,
  });
}

export function registerIntegrationsDeepLinkHandler(): void {
  if (registered) return;
  registered = true;
  ExpoLinking.addEventListener('url', ({ url }) => handleUrl(url));
  ExpoLinking.getInitialURL().then((url) => { if (url) handleUrl(url); });
}
