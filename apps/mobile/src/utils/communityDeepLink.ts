import * as ExpoLinking from 'expo-linking';
import { Alert } from 'react-native';
import { navigate } from '../navigation/navigationRef';
import { fetchApi } from './api';

// Mirrors utils/integrationsDeepLink.ts — no React Navigation `linking`
// config exists app-wide, so this is a small dedicated listener for
// lifeos://community/join?code=... invite links (shared outside the app,
// e.g. via Share.share) rather than wiring up a new app-wide system.
let registered = false;

async function handleUrl(url: string) {
  const { path, queryParams } = ExpoLinking.parse(url);
  if (path !== '/community/join' && path !== 'community/join') return;
  const code = queryParams?.code;
  if (!code || typeof code !== 'string') return;

  try {
    const res = await fetchApi(`/communities/invites/${code}/redeem`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Couldn't join that community");
    navigate('Community', { communityId: data.communityId, communityName: data.communityName });
  } catch (e: any) {
    Alert.alert('Invite link', e.message || "Couldn't join that community");
  }
}

export function registerCommunityDeepLinkHandler(): void {
  if (registered) return;
  registered = true;
  ExpoLinking.addEventListener('url', ({ url }) => handleUrl(url));
  ExpoLinking.getInitialURL().then((url) => { if (url) handleUrl(url); });
}
