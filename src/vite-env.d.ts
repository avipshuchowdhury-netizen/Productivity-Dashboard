/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_ALLOWED_AUTH_DOMAIN?: string;
  readonly VITE_ALLOWED_AUTH_EMAILS?: string;
  readonly VITE_ENTRY_MANAGER_EMAILS?: string;
  readonly VITE_ENABLE_ACCOUNT_CREATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
