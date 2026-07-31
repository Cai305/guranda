# Developer SDK Specification: MXit 2.0

## 1. Overview
The MXit 2.0 Developer SDK allows third-party developers to build and publish Mini-Apps and Games within the SuperApp ecosystem. It provides bindings for JavaScript/TypeScript, enabling deep integration with the MXit UI and APIs.

## 2. Core Capabilities
- **Authentication**: Single Sign-On (SSO) using the user's MXit identity.
- **Payments**: Processing transactions via the Masheleni 2.0 wallet.
- **Social Graph**: Requesting access to the user's friend list to invite players to games.
- **Hardware/Sensors**: Access to camera, location, and microphone (subject to user permission prompts).

## 3. Implementation Example (JavaScript SDK)

```javascript
// Import the MXit SDK
import mxit from '@mxit/sdk';

// 1. Initialize App
mxit.init({ appId: 'YOUR_APP_ID' }).then(() => {
    console.log('App Initialized in MXit context');
});

// 2. Request User Identity
mxit.user.getProfile().then(profile => {
    console.log(`Hello, ${profile.nickname}!`);
});

// 3. Process Masheleni Payment
async function buyItem(itemId) {
    try {
        const receipt = await mxit.wallet.pay({
            amount: 50.00,
            currency: 'ZAR',
            description: 'Magic Sword (MoonBase)',
            recipient: 'YOUR_MERCHANT_ID'
        });
        console.log('Payment Successful', receipt);
    } catch (error) {
        console.error('Payment Failed', error);
    }
}

// 4. Share to Chat
mxit.social.share({
    title: 'Beat my high score!',
    link: 'mxit://app/moonbase/room123',
    image: 'https://example.com/score.png'
});
```

## 4. App Publishing
Developers submit their mini-app bundle (HTML/CSS/JS) via the MXit Developer Portal. Apps undergo an automated security scan and manual review before appearing in the Hub.
