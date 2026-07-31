// e2e-test stand-in for expo-server-sdk. The real package's compiled
// `build/ExpoClient.js` mixes ESM syntax into what's meant to be its CJS
// entry point, so requiring it under Jest throws a SyntaxError regardless of
// transform config — this was already broken before this test suite was
// added (see docs/ARCHITECTURE_RECOMMENDATIONS.md #8). Not worth pulling in
// a real push-notification client for e2e tests anyway: this repo's own
// push.ts already treats delivery failures as non-fatal (returns false,
// logs a warning), so a stub that always reports "not a valid token" is
// behaviorally correct for every existing caller.
class Expo {
  static isExpoPushToken() {
    return false;
  }
  async sendPushNotificationsAsync() {
    return [];
  }
}

module.exports = { Expo };
