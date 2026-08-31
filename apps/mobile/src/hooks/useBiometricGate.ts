import { useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricMethod = 'FINGERPRINT' | 'FACE_ID';

// Runs a real on-device biometric check (Face ID / fingerprint / whatever
// the device offers) and reports back which kind succeeded. Nothing
// biometric ever leaves the device — this only returns a pass/fail plus a
// label, which is all the backend ever records (ElectionCheckIn.method).
export function useBiometricGate() {
  return useCallback(async (): Promise<{ ok: boolean; method: BiometricMethod; reason?: string }> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { ok: false, method: 'FINGERPRINT', reason: 'This device has no biometric sensor' };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { ok: false, method: 'FINGERPRINT', reason: 'No fingerprint or face enrolled on this device' };

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const method: BiometricMethod = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    )
      ? 'FACE_ID'
      : 'FINGERPRINT';

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity to continue',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return { ok: false, method, reason: result.error === 'user_cancel' ? 'Cancelled' : 'Verification failed' };
    }
    return { ok: true, method };
  }, []);
}
