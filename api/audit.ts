import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateWorkspaceUser,
  getAuditDb,
  normalizeAuditItem,
  parseJsonBody,
  requireEntryManager,
  setSecureApiHeaders,
  stripUndefined
} from './_firebaseAdmin';

type StoredAuditItem = {
  id: string;
  createdAt?: string;
  createdByEmail?: string;
  [key: string]: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecureApiHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const user = await authenticateWorkspaceUser(req, res);
  if (!user) return;

  const { action, item } = parseJsonBody(req.body) as {
    action?: string;
    item?: Record<string, unknown>;
  };

  const auditItems = getAuditDb().collection('auditItems');

  try {
    if (action === 'create') {
      const now = new Date().toISOString();
      const newItem = normalizeAuditItem({
        ...(item || {}),
        id: `aud-${Date.now()}`,
        createdAt: now,
        createdByEmail: user.email,
        updatedAt: now,
        updatedByEmail: user.email,
        archivedAt: undefined,
        archiveReason: undefined,
        archivedByEmail: undefined
      });

      if (!newItem.title) {
        return res.status(400).json({ error: 'Title is required.' });
      }

      await auditItems.doc(newItem.id).set(stripUndefined(newItem));
      return res.status(200).json({ success: true, item: newItem });
    }

    if (!requireEntryManager(user, res)) return;

    if (!item?.id) {
      return res.status(400).json({ error: 'Missing audit item id.' });
    }

    const itemId = String(item.id);
    const docRef = auditItems.doc(itemId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      return res.status(404).json({ error: 'Audit item not found.' });
    }

    const existingItem: StoredAuditItem = { id: existingDoc.id, ...existingDoc.data() };
    const now = new Date().toISOString();

    if (action === 'update') {
      const updatedItem = normalizeAuditItem({
        ...existingItem,
        ...item,
        id: existingItem.id,
        createdAt: existingItem.createdAt,
        createdByEmail: existingItem.createdByEmail,
        updatedAt: now,
        updatedByEmail: user.email
      });

      if (!updatedItem.title) {
        return res.status(400).json({ error: 'Title is required.' });
      }

      await docRef.set(stripUndefined(updatedItem));
      return res.status(200).json({ success: true, item: updatedItem });
    }

    if (action === 'archive' || action === 'delete') {
      const archivedItem = normalizeAuditItem({
        ...existingItem,
        archivedAt: now,
        archiveReason: item.archiveReason || 'manual',
        archivedByEmail: user.email,
        updatedAt: now,
        updatedByEmail: user.email
      });

      await docRef.set(stripUndefined(archivedItem));
      return res.status(200).json({ success: true, item: archivedItem });
    }

    if (action === 'restore') {
      const restoredItem = normalizeAuditItem({
        ...existingItem,
        archivedAt: undefined,
        archiveReason: undefined,
        archivedByEmail: undefined,
        updatedAt: now,
        updatedByEmail: user.email
      });

      await docRef.set(stripUndefined(restoredItem));
      return res.status(200).json({ success: true, item: restoredItem });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  } catch (error) {
    console.error('Unable to write audit item', error);
    return res.status(500).json({ error: 'Audit item could not be saved.' });
  }
}
