#!/usr/bin/env bash
# One-time setup: gives the GitHub build what it needs to sign the app and send updates to your phone.
# Stores these as encrypted GitHub Actions secrets on arahkhan99/amal-tracker (nothing is written to disk):
#   FIREBASE_SERVICE_ACCOUNT  key for the "github-deploy" account (can only manage App Distribution)
#   KEYSTORE_BASE64 / KEYSTORE_PASSWORD  the app signing key from C:/Users/chito/amal-tracker-signing
#   FIREBASE_ANDROID_APP_ID, TESTER_EMAIL, GOOGLE_SERVICES_JSON
# Run from the project folder:  ! bash scripts/setup-github-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
GH="/c/Program Files/GitHub CLI/gh.exe"
P=amal-tracker-cfe23
SA="github-deploy@$P.iam.gserviceaccount.com"
SIGN=/c/Users/chito/amal-tracker-signing

TOKEN=$(node -e '
const auth = require("./node_modules/firebase-tools/lib/auth.js");
auth.getAccessToken(auth.getGlobalDefaultAccount().tokens.refresh_token, []).then(t => process.stdout.write(t.access_token));')

echo "Creating a key for $SA and storing it in GitHub..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://iam.googleapis.com/v1/projects/$P/serviceAccounts/$SA/keys" -d '{}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const k=JSON.parse(s);if(!k.privateKeyData){console.error(s);process.exit(1)}process.stdout.write(Buffer.from(k.privateKeyData,"base64").toString())})' \
  | "$GH" secret set FIREBASE_SERVICE_ACCOUNT

echo "Storing the app signing key..."
grep storePassword "$SIGN/keystore.properties" | cut -d= -f2 | tr -d '\r\n' | "$GH" secret set KEYSTORE_PASSWORD
base64 -w0 "$SIGN/amal-release.keystore" | "$GH" secret set KEYSTORE_BASE64

echo "Storing Firebase app details..."
printf '1:256536797102:android:3a40c537e3c1ec40c5723f' | "$GH" secret set FIREBASE_ANDROID_APP_ID
printf 'arah.khan99@gmail.com' | "$GH" secret set TESTER_EMAIL
"$GH" secret set GOOGLE_SERVICES_JSON < android/app/google-services.json

"$GH" secret list
echo "Done."
