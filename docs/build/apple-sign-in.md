# Sign in with Apple: what you need to set up

Zad now has a **Sign in with Apple** button next to Google, on both sign-in screens (Settings → Cloud backup and
the onboarding "Log in" screen). App Store Review Guideline 4.8 asks for it because Google sign-in sets up the
user's account. The code is done. The button **won't work until you finish the console steps below**, and until
then tapping it just shows "Sign-in didn't finish".

| Platform | How it signs in | What it needs |
|---|---|---|
| iPhone / iPad | Apple's own native sheet (Face ID), through `@capacitor-firebase/authentication` | Steps 1, 2, 4, 6 |
| Android | Firebase's Apple web flow (a browser tab opens Apple's page), through the same plugin | Steps 1–5 |
| Web (PWA) | Firebase's Apple popup (`OAuthProvider("apple.com")`) | Steps 1–5 |

Why it's on Android and the web too: someone who starts on an iPhone with Apple, then switches to an Android
phone, must be able to sign in with the same Apple ID to get their backup back. Firebase supports Apple on Android
and the web through its web flow, so the button is shown everywhere (`appleAvailable()` in `src/views/consent.js`;
make it return `Capacitor.getPlatform() === "ios"` if you ever want iOS only).

The facts you'll need:

- **Bundle ID** (App ID): `com.zad.app` (from `ios/App/App.xcodeproj` and `capacitor.config.json`)
- **Firebase project**: `amal-tracker-cfe23` ("Zad App")
- **Firebase auth domain**: `amal-tracker-cfe23.firebaseapp.com`
- **Return URL** for Apple: `https://amal-tracker-cfe23.firebaseapp.com/__/auth/handler`

You need a paid Apple Developer Program membership (you already need it for TestFlight).

---

## 1. Apple Developer: turn on Sign in with Apple for the app

1. Go to <https://developer.apple.com/account> and sign in.
2. Click **Certificates, IDs & Profiles**, then **Identifiers** in the left menu.
3. In the list, click the App ID **com.zad.app**. (If it isn't there: click **+**, choose **App IDs**, then **App**,
   type the description "Zad" and the Bundle ID `com.zad.app` (Explicit), and continue.)
4. Scroll down the **Capabilities** list and tick **Sign In with Apple**. Leave it on "Enable as a primary App ID".
5. Click **Save** (top right), then **Confirm**.
6. Write down your **Team ID**: it's the 10-character code shown at the top right of the page, under your name
   (for example `A1B2C3D4E5`). You'll paste it into Firebase in step 4.

## 2. Apple Developer: create a Services ID (needed for Android and the web)

1. Still in **Identifiers**, click **+**.
2. Choose **Services IDs** and click **Continue**.
3. Description: `Zad sign-in`. Identifier: `com.zad.app.signin` (it must be different from the App ID). Click
   **Continue**, then **Register**.
4. Click the new `com.zad.app.signin` in the list. Tick **Sign In with Apple**, then click **Configure** next to it.
5. **Primary App ID**: choose `com.zad.app`.
6. **Domains and Subdomains**: `amal-tracker-cfe23.firebaseapp.com`
7. **Return URLs**: `https://amal-tracker-cfe23.firebaseapp.com/__/auth/handler`
8. Click **Next**, **Done**, then **Continue** and **Save**.

## 3. Apple Developer: create a key (needed for Android, the web and for revoking tokens)

1. In the left menu click **Keys**, then **+**.
2. Key name: `Zad Sign in with Apple`. Tick **Sign in with Apple**, click **Configure**, choose `com.zad.app` as
   the Primary App ID, then **Save**.
3. Click **Continue**, then **Register**.
4. Click **Download**. You get a file named like `AuthKey_XXXXXXXXXX.p8`. **You can download it only once.** Keep it
   somewhere safe (a password manager is good). Never put it in the project folder or on GitHub.
5. Write down the **Key ID** (the 10 characters in the file name, also shown on the page).

## 4. Firebase console: turn on the Apple provider

1. Go to <https://console.firebase.google.com> and open **Zad App** (`amal-tracker-cfe23`).
2. Left menu: **Build → Authentication**, then the **Sign-in method** tab.
3. Click **Add new provider**, then **Apple**. Switch **Enable** on.
4. Fill in:
   - **Services ID**: `com.zad.app.signin` (from step 2)
   - **OAuth code flow configuration**:
     - **Apple team ID**: your Team ID (step 1.6)
     - **Key ID**: the Key ID (step 3.5)
     - **Private key**: open the `.p8` file in Notepad and paste everything, including the
       `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.
5. Click **Save**.
6. Still in Authentication, open the **Settings** tab → **User account linking**. Leave it on **Link accounts that
   use the same email** (the default). If someone signs in with Apple using the same email as an earlier Google
   sign-in, Firebase stops it and Zad shows "This email already uses a different sign-in. Use the button you signed
   in with before." People who choose "Hide my email" get a private relay address, which never clashes.

## 5. Apple Developer: let Apple email "Hide my email" users (optional, recommended)

Apple only forwards email to `…@privaterelay.appleid.com` addresses from domains you register. Zad never emails
people today, so this is only needed if you will reply to someone by email.

1. **Certificates, IDs & Profiles → Services → Sign in with Apple for Email Communication → Configure**.
2. Add the email address or domain you will send from (for example the support address in `privacy.html`), and
   follow Apple's instructions (SPF record for a domain).

## 6. Xcode (on the Mac): add the capability

The entitlement is already in `ios/App/App/App.entitlements`:

```xml
<key>com.apple.developer.applesignin</key>
<array><string>Default</string></array>
```

1. `npm run build:ios`, then open `ios/App/App.xcodeproj` in Xcode.
2. Click the **App** target → **Signing & Capabilities**.
3. Click **+ Capability** and add **Sign in with Apple**. If Xcode asks which entitlements file to use, choose
   `App/App.entitlements` (it already has the key, so nothing changes in it).
4. Make sure **Automatically manage signing** is on and your team is chosen, so Xcode refreshes the provisioning
   profile with the new capability. If it shows a red error about the profile, click **Try Again**.
5. Run on a real iPhone (the simulator needs to be signed in to an Apple ID to test Apple sign-in).

Nothing extra is needed in the Swift Package traits: the plugin's Apple sign-in uses Apple's own
AuthenticationServices, not a third-party SDK. `capacitor.config.json` already lists `"apple.com"` under
`FirebaseAuthentication.providers` (run `npx cap sync` after pulling so the copies in `ios/` and `android/` match).

## 7. Test it

1. iPhone: Settings → Cloud backup → tick the box → **Sign in with Apple** → Face ID. Try once with **Hide my
   email**: Settings should then show "your Apple ID (email hidden)" instead of the relay address.
2. Android: same steps. A browser tab opens Apple's page; sign in, and it returns to Zad.
3. Web: same steps; a popup opens.
4. First sign-in only: Apple gives Zad your first name once. Zad uses it only if no name is set yet, and never asks
   Apple again. To test this again, remove Zad from your Apple ID (iPhone Settings → your name → Sign in with
   Apple → Zad → Stop Using Apple ID).
5. Delete account: Settings → Delete my account. For Apple users Zad asks Apple to confirm first (so nothing is
   deleted if you cancel), then deletes the backup, **revokes Zad's Apple token**, and deletes the sign-in. After
   that, Zad disappears from the Apple ID's "Sign in with Apple" list (App Store guideline 5.1.1(v)).

## How it works in the code

- `src/cloud.js`: `signIn({ provider: "google" | "apple", consent: true })`. Native: the plugin's
  `signInWithApple()` returns Apple's ID token and raw nonce, and the Firebase JS SDK signs in with
  `new OAuthProvider("apple.com").credential({ idToken, rawNonce })` (the plugin runs with `skipNativeAuth`, as for
  Google). Web: `signInWithPopup(auth, new OAuthProvider("apple.com"))` with the `email` and `name` scopes, falling
  back to a redirect when popups are blocked.
- Name: `S.profile.name` is filled from Apple's name only if it's empty (Apple sends it on the first sign-in only).
- Private relay emails (`@privaterelay.appleid.com`): shown as "your Apple ID (email hidden)", and not prefilled as a
  reply address in Send feedback.
- Deletion: `deleteAccount()` re-confirms with Apple first and revokes the token before deleting the Firebase user.
  iOS: the plugin signs in natively for that one confirmation and revokes the **authorization code** with
  `FirebaseAuthentication.revokeAccessToken` (Firebase iOS `revokeToken(withAuthorizationCode:)`). Android: the
  plugin's Firebase Android session revokes the OAuth access token it got back. Web: `revokeAccessToken(auth,
  accessToken)` from the Firebase JS SDK. Revoking is best effort: if it fails (no token returned, or the Apple
  key in step 3 is missing), the account and backup are still deleted, the failure is logged, and the user can
  remove Zad by hand in their Apple ID settings. Android is the least certain path: test it on a real phone.
- Tests: `tests/apple.test.js` (native plugin mocked) and the Apple cases in `tests/account.test.js` (web).

## Still to do outside the code

- `public/privacy.html`: mention Apple as a sign-in provider (Firebase Authentication keeps the Apple ID email,
  which may be a relay address, and the name Apple shares once) and relay emails (privacy audit B2). Not changed
  in this task.
- App Store Connect privacy labels: no change in the data types (email and user ID are already declared for Google
  sign-in), but check the answers once the app is submitted.
