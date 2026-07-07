import {
  type ApiRequest,
  type ApiResponse,
  authenticateWorkspaceUser,
  getAuditDb,
  normalizeAuditItem,
  parseJsonBody,
  requireEntryManager,
  setSecureApiHeaders,
  stripUndefined
} from './_firebaseAdmin.js';
import {
  fetchSocialAuditItems,
  isValidSocialSyncSecret
} from './_socialSync.js';

type StoredAuditItem = {
  id: string;
  createdAt?: string;
  createdByEmail?: string;
  archivedAt?: string;
  archiveReason?: string;
  archivedByEmail?: string;
  [key: string]: unknown;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setSecureApiHeaders(res);

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const cronAuthorized = isValidSocialSyncSecret(req.headers);
  if (!cronAuthorized) {
    const user = await authenticateWorkspaceUser(req, res);
    if (!user || !requireEntryManager(user, res)) return;
  }

  try {
    const requestBody = parseJsonBody(req.body) as {
      startDate?: string;
      endDate?: string;
    };
    const result = await fetchSocialAuditItems({
      startDate: req.method === 'POST' ? requestBody.startDate : undefined,
      endDate: req.method === 'POST' ? requestBody.endDate : undefined
    });

    if (result.items.length === 0) {
      return res.status(200).json({
        success: result.success,
        syncedItems: 0,
        configuredAccounts: result.configuredAccounts,
        requestedDateRange: result.requestedDateRange,
        warnings: result.warnings
      });
    }

    const db = await getAuditDb();
    const auditItems = db.collection('auditItems');
    const existingSnapshot = await auditItems.get();
    const existingById = new Map<string, StoredAuditItem>();
    existingSnapshot.docs.forEach((doc) => {
      existingById.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const batch = db.batch();
    result.items.forEach((item) => {
      const existingItem = existingById.get(item.id);
      const mergedItem = normalizeAuditItem({
        ...(existingItem || {}),
        ...item,
        id: item.id,
        createdAt: existingItem?.createdAt || item.createdAt,
        createdByEmail: existingItem?.createdByEmail || item.createdByEmail,
        archivedAt: existingItem?.archivedAt,
        archiveReason: existingItem?.archiveReason,
        archivedByEmail: existingItem?.archivedByEmail,
        updatedAt: result.fetchedAt,
        updatedByEmail: 'social-sync@varaheanalytics.com',
        syncedAt: result.fetchedAt
      });
      batch.set(auditItems.doc(mergedItem.id), stripUndefined(mergedItem));
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      syncedItems: result.items.length,
      configuredAccounts: result.configuredAccounts,
      requestedDateRange: result.requestedDateRange,
      warnings: result.warnings
    });
  } catch (error) {
    if ((error as Error).message.includes('Sync date range')) {
      return res.status(400).json({ error: (error as Error).message });
    }
    console.error('Unable to sync social platform data', error);
    return res.status(500).json({ error: 'Social platform data could not be synced.' });
  }
}
