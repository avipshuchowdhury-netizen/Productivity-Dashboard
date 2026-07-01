import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredConfig = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId]
] as const;

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';
const parseEmailList = (value: string) => value
  .split(',')
  .map(normalizeEmail)
  .filter(Boolean);

export const missingFirebaseConfig = requiredConfig
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseConfig.length === 0;

export const allowedAuthDomain = (import.meta.env.VITE_ALLOWED_AUTH_DOMAIN || 'varaheanalytics.com')
  .trim()
  .toLowerCase()
  .replace(/^@/, '');

export const allowedAuthEmails = parseEmailList(import.meta.env.VITE_ALLOWED_AUTH_EMAILS || '');

export const entryManagerEmails = parseEmailList(
  import.meta.env.VITE_ENTRY_MANAGER_EMAILS || 'avipshu.chowdhury@varaheanalytics.com'
);

export const isAccountCreationEnabled = import.meta.env.VITE_ENABLE_ACCOUNT_CREATION === 'true';

export const isAllowedAuthEmail = (email?: string | null) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const matchesDomain = normalizedEmail.endsWith(`@${allowedAuthDomain}`);
  const matchesOptionalAllowlist = allowedAuthEmails.length === 0 || allowedAuthEmails.includes(normalizedEmail);
  return matchesDomain && matchesOptionalAllowlist;
};

export const canManageEntriesForEmail = (email?: string | null) => entryManagerEmails.includes(normalizeEmail(email));

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  setPersistence(firebaseAuth, browserLocalPersistence).catch(error => {
    console.warn('Firebase auth persistence could not be set', error);
  });
}

export { firebaseApp, firebaseAuth };
