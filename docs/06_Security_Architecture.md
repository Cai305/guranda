# Security Architecture: MXit 2.0

## 1. Data in Transit
- **TLS 1.3**: All client-to-server REST/GraphQL traffic must be encrypted over HTTPS.
- **WSS**: WebSocket connections for MQTT are secured over WSS.

## 2. End-to-End Encryption (E2EE)
- **Scope**: 1-on-1 private messages and self-custodial wallet private keys.
- **Protocol**: Implementation of the Signal Protocol (Double Ratchet Algorithm).
- **Key Management**: Public keys are stored on the Auth Service. Private keys never leave the user's device unless explicitly backed up (encrypted) to the cloud.

## 3. Masheleni 2.0 Wallet Security
### Platform-Custodial Option
- Private keys managed by MXit using Hardware Security Modules (HSMs).
- Withdrawals over certain limits require MFA (OTP via SMS or Authenticator app).

### Self-Custodial Option
- Private keys are generated locally on the device (BIP39 seed phrase).
- Keys are stored in the device's Secure Enclave / Keystore.
- Transactions are signed locally and only the signed payload is sent to the Wallet Service.

## 4. Application Security
- **Authentication**: JWT access tokens (short-lived, 15m) and refresh tokens (HTTP-only secure cookies or Secure Storage on mobile).
- **Rate Limiting**: IP and User-ID based rate limiting at the API Gateway to prevent brute force and DDoS.
- **Mini-App Sandboxing**: Webviews for mini-apps are tightly restricted. They cannot access local device storage or the clipboard without explicit permission APIs via the MXit JS SDK.

## 5. Compliance & Moderation
- **KYC/AML**: Integration with local African identity providers (e.g., Home Affairs databases) for wallet tiers.
- **Child Safety**: AI scanning for CSAM and age-gating for public chat rooms.
