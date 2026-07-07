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

## Automated Meta + YouTube Fetching

The app includes a server-side sync endpoint at `/api/social-sync`.

What is automated:

- Meta Graph API fetches Facebook Page posts and Instagram Business/Creator media for configured pages.
- YouTube Data API fetches recent channel uploads and public video statistics.
- YouTube Analytics API is used for share counts when OAuth refresh credentials are configured.
- Synced records are upserted into the same `auditItems` collection as manual contributor uploads.
- The entry manager can choose a start/end date in the dashboard and run the sync in one click.
- Contributors can refresh dashboard data, but only the entry manager can trigger platform API syncs.

Setup steps:

1. In Meta Developers, create or use the app that has access to the onboarded Facebook Pages and linked Instagram professional accounts.
2. Request/confirm permissions such as `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, and `instagram_manage_insights` as needed for your data.
3. Generate long-lived Page access tokens for each Page or store one shared token if it covers all configured Pages.
4. In Google Cloud, enable YouTube Data API v3 and YouTube Analytics API.
5. Create OAuth credentials and save a refresh token for each YouTube channel owner where private/analytics data is required. A server-side API key is enough for public video stats.
6. Copy `.env.example` to `.env` and fill `SOCIAL_SYNC_ACCOUNTS` with the onboarded page/channel IDs.
7. Run `npm run dev`, sign in as the entry manager, choose the date range, and click `Sync Data`.
8. For scheduled syncs, call `GET /api/social-sync` from your scheduler with `Authorization: Bearer $SOCIAL_SYNC_CRON_SECRET` or `x-social-sync-secret: $SOCIAL_SYNC_CRON_SECRET`. Scheduled syncs use `SOCIAL_SYNC_LOOKBACK_DAYS`.

Minimal account config shape:

```json
[
  {
    "id": "samarth-national",
    "name": "SAMARTH National Desk",
    "author": "SAMARTH Desk",
    "state": "National",
    "facebookUrl": "https://facebook.com/samarthnational",
    "instagramUrl": "https://instagram.com/samarthnational",
    "youtubeUrl": "https://youtube.com/@samarthnational",
    "facebook": {
      "pageId": "FACEBOOK_PAGE_ID",
      "pageAccessTokenEnv": "META_PAGE_ACCESS_TOKEN"
    },
    "instagram": {
      "igUserId": "INSTAGRAM_BUSINESS_ACCOUNT_ID",
      "accessTokenEnv": "META_PAGE_ACCESS_TOKEN"
    },
    "youtube": {
      "channelId": "YOUTUBE_CHANNEL_ID",
      "apiKeyEnv": "YOUTUBE_API_KEY",
      "refreshTokenEnv": "YOUTUBE_REFRESH_TOKEN",
      "clientIdEnv": "YOUTUBE_OAUTH_CLIENT_ID",
      "clientSecretEnv": "YOUTUBE_OAUTH_CLIENT_SECRET"
    }
  }
]
```

Use separate env var names per page/channel if tokens differ, for example `META_PAGE_ACCESS_TOKEN_UP`, `YOUTUBE_REFRESH_TOKEN_UP`, then reference those names inside `SOCIAL_SYNC_ACCOUNTS`.
