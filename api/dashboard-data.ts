import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateWorkspaceUser,
  getAuditDb,
  setSecureApiHeaders
} from './_firebaseAdmin.js';

type StoredAuditItem = {
  id: string;
  publishedAt?: string;
  [key: string]: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecureApiHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const user = await authenticateWorkspaceUser(req, res);
  if (!user) return;

  try {
    const snapshot = await getAuditDb().collection('auditItems').get();
    const auditItems = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as StoredAuditItem)
      .sort((a: StoredAuditItem, b: StoredAuditItem) => {
        const aDate = typeof a.publishedAt === 'string' ? new Date(a.publishedAt).getTime() : 0;
        const bDate = typeof b.publishedAt === 'string' ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate || String(b.id).localeCompare(String(a.id));
      });

    return res.status(200).json({ auditItems });
  } catch (error) {
    console.error('Unable to read audit items', error);
    return res.status(500).json({ error: 'Workspace data could not be loaded.' });
  }
}
