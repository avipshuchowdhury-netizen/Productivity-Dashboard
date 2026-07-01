# Social Media Team Productivity & Analytics Dashboard

Local dashboard for contributor data uploads and social media performance insights.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`
3. Add your Firebase Web app values to `.env`
4. Run the app: `npm run dev`
5. Open `http://localhost:3000`

## Firebase Auth

The app uses Firebase Authentication on the client. Add these Vite variables locally and in Vercel:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

To restrict the visible client app to selected accounts:

```bash
VITE_ALLOWED_AUTH_DOMAIN=varaheanalytics.com
VITE_ALLOWED_AUTH_EMAILS=
VITE_ENTRY_MANAGER_EMAILS=avipshu.chowdhury@varaheanalytics.com
```

To enforce Firebase ID token verification on the Express API, add Firebase Admin service account values and enable enforcement:

```bash
FIREBASE_AUTH_ENFORCED=true
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_ALLOWED_DOMAIN=varaheanalytics.com
FIREBASE_ALLOWED_EMAILS=
FIREBASE_ENTRY_MANAGER_EMAILS=avipshu.chowdhury@varaheanalytics.com
```

Security model:

- Only verified Firebase Google users with an `@varaheanalytics.com` email can load the workspace.
- All production API routes require a Firebase ID token verified by Firebase Admin.
- Any `@varaheanalytics.com` contributor can create/upload entries.
- Only `avipshu.chowdhury@varaheanalytics.com` can edit, archive, restore, or delete entries.
- Local entry write fallback is disabled; the secure API is the source of truth.

Firebase CLI auth setup:

- `firebase.json` enables Google Sign-In for the project in `.firebaserc`.
- Deploy provider config with `npx firebase-tools deploy --only auth`.
- Keep Email/Password disabled in Firebase Authentication.
- Keep `samarth-productivity-dashboard.vercel.app` in Firebase Authentication authorized domains so production Google sign-in can run.

Keep `.env` and service account private keys out of Git.
