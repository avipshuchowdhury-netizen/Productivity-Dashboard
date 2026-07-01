import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuditItem } from '../src/types';

export type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

export type FirebaseWorkspaceUser = {
  uid: string;
  email: string;
  canManageEntries: boolean;
};

type FirestoreAuditItem = AuditItem & {
  createdAt?: string;
  createdByEmail?: string;
  updatedAt?: string;
  updatedByEmail?: string;
  archivedByEmail?: string;
  [key: string]: string | number | undefined;
};

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';
const parseEmailList = (value: string) => value
  .split(',')
  .map(normalizeEmail)
  .filter(Boolean);

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

const allowedFirebaseDomain = (process.env.FIREBASE_ALLOWED_DOMAIN || 'varaheanalytics.com')
  .trim()
  .toLowerCase()
  .replace(/^@/, '');
const allowedFirebaseEmails = parseEmailList(process.env.FIREBASE_ALLOWED_EMAILS || '');
const entryManagerEmails = parseEmailList(
  process.env.FIREBASE_ENTRY_MANAGER_EMAILS || 'avipshu.chowdhury@varaheanalytics.com'
);

const hasFirebaseAdminConfig = Boolean(
  firebaseAdminConfig.projectId &&
  firebaseAdminConfig.clientEmail &&
  firebaseAdminConfig.privateKey
);

const firebaseSecureTokenJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const isAllowedWorkspaceEmail = (email?: string | null) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const matchesDomain = normalizedEmail.endsWith(`@${allowedFirebaseDomain}`);
  const matchesOptionalAllowlist = allowedFirebaseEmails.length === 0 || allowedFirebaseEmails.includes(normalizedEmail);
  return matchesDomain && matchesOptionalAllowlist;
};

const canManageEntries = (email?: string | null) => entryManagerEmails.includes(normalizeEmail(email));

const getFirebaseApp = async () => {
  if (!hasFirebaseAdminConfig) {
    throw new Error('Firebase Admin config is missing.');
  }

  const { cert, getApps, initializeApp } = await import('firebase-admin/app');

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey
      })
    });
  }
  return getApps()[0];
};

export const getAuditDb = async () => {
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(await getFirebaseApp());
};

export const setSecureApiHeaders = (res: ApiResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
};

export const authenticateWorkspaceUser = async (
  req: ApiRequest,
  res: ApiResponse
): Promise<FirebaseWorkspaceUser | null> => {
  const authorizationHeader = req.headers.authorization || '';
  const token = typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : '';

  if (!token) {
    res.status(401).json({ error: 'Missing Firebase ID token.' });
    return null;
  }

  if (!firebaseAdminConfig.projectId) {
    res.status(500).json({ error: 'Firebase project ID is missing.' });
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, firebaseSecureTokenJwks, {
      issuer: `https://securetoken.google.com/${firebaseAdminConfig.projectId}`,
      audience: firebaseAdminConfig.projectId
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';

    if (!isAllowedWorkspaceEmail(email)) {
      res.status(403).json({ error: `Only verified @${allowedFirebaseDomain} users can access this workspace.` });
      return null;
    }

    if (payload.email_verified !== true) {
      res.status(403).json({ error: 'Firebase email must be verified before accessing this workspace.' });
      return null;
    }

    return {
      uid: String(payload.user_id || payload.sub || ''),
      email: email || '',
      canManageEntries: canManageEntries(email)
    };
  } catch (error) {
    console.error('Firebase token verification failed', error);
    res.status(401).json({ error: 'Invalid Firebase ID token.' });
    return null;
  }
};

export const requireEntryManager = (
  user: FirebaseWorkspaceUser,
  res: ApiResponse
) => {
  if (!user.canManageEntries) {
    res.status(403).json({ error: 'Only avipshu.chowdhury@varaheanalytics.com can edit, archive, restore, or delete entries.' });
    return false;
  }
  return true;
};

export const parseJsonBody = (body: unknown) => {
  if (typeof body !== 'string') return body || {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const clampText = (value: unknown, fallback = '', maxLength = 180) => {
  const text = typeof value === 'string' ? value : String(value || fallback);
  return text.trim().slice(0, maxLength);
};

const clampNumber = (value: unknown, max = 1_000_000_000) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return Math.min(Math.floor(numericValue), max);
};

export const normalizeAuditItem = (record: Record<string, unknown>): FirestoreAuditItem => ({
  id: clampText(record.id || `aud-${Date.now()}`, `aud-${Date.now()}`, 80),
  title: clampText(record.title, '', 220),
  platform: ['facebook', 'instagram', 'youtube'].includes(String(record.platform)) ? record.platform as AuditItem['platform'] : 'instagram',
  format: clampText(record.format || 'reel', 'reel', 40),
  publishedAt: clampText(record.publishedAt || new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10), 20),
  views: clampNumber(record.views),
  likes: clampNumber(record.likes),
  comments: clampNumber(record.comments),
  shares: clampNumber(record.shares),
  author: clampText(record.author || 'Unknown Contributor', 'Unknown Contributor', 120),
  state: record.state ? clampText(record.state, '', 80) : undefined,
  page: record.page ? clampText(record.page, '', 140) : undefined,
  theme: record.theme === 'negative' ? 'negative' : 'positive',
  archivedAt: record.archivedAt ? clampText(record.archivedAt, '', 40) : undefined,
  archiveReason: record.archiveReason ? clampText(record.archiveReason, '', 80) : undefined,
  createdAt: record.createdAt ? clampText(record.createdAt, '', 40) : undefined,
  createdByEmail: record.createdByEmail ? clampText(record.createdByEmail, '', 160) : undefined,
  updatedAt: record.updatedAt ? clampText(record.updatedAt, '', 40) : undefined,
  updatedByEmail: record.updatedByEmail ? clampText(record.updatedByEmail, '', 160) : undefined,
  archivedByEmail: record.archivedByEmail ? clampText(record.archivedByEmail, '', 160) : undefined
});

export const stripUndefined = <T extends Record<string, unknown>>(value: T) => (
  Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as T
);
