import express from "express";
import type { Request, RequestHandler, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: "100kb" }));
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

type FirebaseWorkspaceUser = {
  uid: string;
  email: string;
  canManageEntries: boolean;
};

type AuthenticatedRequest = Request & {
  firebaseUser?: FirebaseWorkspaceUser;
};

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || "";
const parseEmailList = (value: string) => value
  .split(",")
  .map(normalizeEmail)
  .filter(Boolean);

// Auth is always enforced in production. FIREBASE_AUTH_ENFORCED=false only bypasses local development.
const firebaseAuthEnforced = process.env.FIREBASE_AUTH_ENFORCED === "false" && process.env.NODE_ENV !== "production"
  ? false
  : true;
const allowedFirebaseDomain = (process.env.FIREBASE_ALLOWED_DOMAIN || "varaheanalytics.com")
  .trim()
  .toLowerCase()
  .replace(/^@/, "");
const allowedFirebaseEmails = parseEmailList(process.env.FIREBASE_ALLOWED_EMAILS || "");
const entryManagerEmails = parseEmailList(
  process.env.FIREBASE_ENTRY_MANAGER_EMAILS || "avipshu.chowdhury@varaheanalytics.com"
);

const isAllowedWorkspaceEmail = (email?: string | null) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const matchesDomain = normalizedEmail.endsWith(`@${allowedFirebaseDomain}`);
  const matchesOptionalAllowlist = allowedFirebaseEmails.length === 0 || allowedFirebaseEmails.includes(normalizedEmail);
  return matchesDomain && matchesOptionalAllowlist;
};

const canManageEntries = (email?: string | null) => entryManagerEmails.includes(normalizeEmail(email));

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
};

const hasFirebaseAdminConfig = Boolean(
  firebaseAdminConfig.projectId &&
  firebaseAdminConfig.clientEmail &&
  firebaseAdminConfig.privateKey
);

const getFirebaseAdminAuth = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey
      })
    });
  }
  return getAuth();
};

const requireFirebaseAuth: RequestHandler = async (req, res, next) => {
  if (!firebaseAuthEnforced) {
    (req as AuthenticatedRequest).firebaseUser = {
      uid: "local-dev",
      email: "local-dev@varaheanalytics.com",
      canManageEntries: true
    };
    return next();
  }

  const authorizationHeader = req.headers.authorization || "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return res.status(401).json({ error: "Missing Firebase ID token." });
  }

  if (!hasFirebaseAdminConfig) {
    return res.status(500).json({ error: "Firebase API auth is enforced, but server admin config is missing." });
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token, true);
    const email = decodedToken.email?.toLowerCase();

    if (!isAllowedWorkspaceEmail(email)) {
      return res.status(403).json({ error: `Only verified @${allowedFirebaseDomain} users can access this workspace.` });
    }

    if (decodedToken.email_verified !== true) {
      return res.status(403).json({ error: "Firebase email must be verified before accessing this workspace." });
    }

    (req as AuthenticatedRequest).firebaseUser = {
      uid: decodedToken.uid,
      email: email || "",
      canManageEntries: canManageEntries(email)
    };

    return next();
  } catch (error) {
    console.error("Firebase token verification failed", error);
    return res.status(401).json({ error: "Invalid Firebase ID token." });
  }
};

// Path to store physical DB file for true durability during restarts
const DbDirectory = path.join(process.cwd(), "src", "data");
const DbFilePath = path.join(DbDirectory, "db.json");

// Ensure directory exists
if (!fs.existsSync(DbDirectory)) {
  fs.mkdirSync(DbDirectory, { recursive: true });
}

// Database starts blank so onboarding and contributor entries are real user-created records.
const initialDbData = {
  auditItems: []
};

const clampText = (value: unknown, fallback = "", maxLength = 180) => {
  const text = typeof value === "string" ? value : String(value || fallback);
  return text.trim().slice(0, maxLength);
};

const clampNumber = (value: unknown, max = 1_000_000_000) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return Math.min(Math.floor(numericValue), max);
};

const clampUrl = (value: unknown) => {
  const text = clampText(value, "", 700);
  if (!text) return undefined;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const normalizePlatformLinks = (links: any) => {
  const normalized = {
    facebook: clampUrl(links?.facebook),
    instagram: clampUrl(links?.instagram),
    youtube: clampUrl(links?.youtube)
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const requireEntryManager = (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).firebaseUser;
  if (!user?.canManageEntries) {
    res.status(403).json({ error: "Only avipshu.chowdhury@varaheanalytics.com can edit, archive, restore, or delete entries." });
    return null;
  }
  return user;
};

const normalizeDb = (data: any) => {
  return {
    auditItems: Array.isArray(data?.auditItems) ? data.auditItems : []
  };
};

// Function to load database state from file
const getDb = () => {
  if (fs.existsSync(DbFilePath)) {
    try {
      const data = fs.readFileSync(DbFilePath, "utf8");
      return normalizeDb(JSON.parse(data));
    } catch (e) {
      console.error("Error reading db.json, returning initial", e);
      return initialDbData;
    }
  } else {
    // Write initial database standard file
    fs.writeFileSync(DbFilePath, JSON.stringify(initialDbData, null, 2), "utf8");
    return initialDbData;
  }
};

// Function to write back state
const saveDb = (data: any) => {
  fs.writeFileSync(DbFilePath, JSON.stringify(normalizeDb(data), null, 2), "utf8");
};

// API: Fetch aggregate / dashboard state
app.get("/api/dashboard-data", requireFirebaseAuth, (req, res) => {
  const db = getDb();
  res.json(db);
});

// API: Save content audit record
app.post("/api/audit", requireFirebaseAuth, (req, res) => {
  const { action, item } = req.body || {};
  const db = getDb();
  const requester = (req as AuthenticatedRequest).firebaseUser;
  const normalizeAuditItem = (record: any) => ({
    ...record,
    id: clampText(record.id || `aud-${Date.now()}`, `aud-${Date.now()}`, 80),
    title: clampText(record.title, "", 220),
    platform: ["facebook", "instagram", "youtube"].includes(record.platform) ? record.platform : "instagram",
    format: clampText(record.format || "reel", "reel", 40),
    publishedAt: clampText(record.publishedAt || new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10), 20),
    views: clampNumber(record.views),
    likes: clampNumber(record.likes),
    comments: clampNumber(record.comments),
    shares: clampNumber(record.shares),
    author: clampText(record.author || "Unknown Contributor", "Unknown Contributor", 120),
    state: record.state ? clampText(record.state, "", 80) : undefined,
    page: record.page ? clampText(record.page, "", 140) : undefined,
    proofUrl: clampUrl(record.proofUrl),
    pageUrl: clampUrl(record.pageUrl),
    pageLinks: normalizePlatformLinks(record.pageLinks),
    theme: record.theme === "negative" ? "negative" : "positive",
    archivedAt: record.archivedAt ? clampText(record.archivedAt, "", 40) : undefined,
    archiveReason: record.archiveReason ? clampText(record.archiveReason, "", 80) : undefined,
    createdAt: record.createdAt ? clampText(record.createdAt, "", 40) : undefined,
    createdByEmail: record.createdByEmail ? clampText(record.createdByEmail, "", 160) : undefined,
    updatedAt: record.updatedAt ? clampText(record.updatedAt, "", 40) : undefined,
    updatedByEmail: record.updatedByEmail ? clampText(record.updatedByEmail, "", 160) : undefined,
    archivedByEmail: record.archivedByEmail ? clampText(record.archivedByEmail, "", 160) : undefined
  });

  if (action === "create") {
    if (!requester) {
      return res.status(401).json({ error: "Missing authenticated Firebase user." });
    }

    const now = new Date().toISOString();
    const newItem = normalizeAuditItem({
      ...item,
      id: "aud-" + Date.now(),
      createdAt: now,
      createdByEmail: requester.email,
      updatedAt: now,
      updatedByEmail: requester.email,
      archivedAt: undefined,
      archiveReason: undefined,
      archivedByEmail: undefined
    });

    if (!newItem.title) {
      return res.status(400).json({ error: "Title is required." });
    }

    db.auditItems.push(newItem);
    saveDb(db);
    return res.json({ success: true, item: newItem });
  } else if (action === "update") {
    const manager = requireEntryManager(req, res);
    if (!manager) return;

    if (!item?.id) {
      return res.status(400).json({ error: "Missing audit item id" });
    }

    const index = db.auditItems.findIndex((a: any) => a.id === String(item.id));
    if (index === -1) {
      return res.status(404).json({ error: "Audit item not found" });
    }

    const now = new Date().toISOString();
    const existingItem = db.auditItems[index];
    const updatedItem = normalizeAuditItem({
      ...existingItem,
      ...item,
      id: existingItem.id,
      createdAt: existingItem.createdAt,
      createdByEmail: existingItem.createdByEmail,
      updatedAt: now,
      updatedByEmail: manager.email
    });

    if (!updatedItem.title) {
      return res.status(400).json({ error: "Title is required." });
    }

    db.auditItems[index] = updatedItem;
    saveDb(db);
    return res.json({ success: true, item: updatedItem });
  } else if (action === "archive") {
    const manager = requireEntryManager(req, res);
    if (!manager) return;

    if (!item?.id) {
      return res.status(400).json({ error: "Missing audit item id" });
    }

    const index = db.auditItems.findIndex((a: any) => a.id === String(item.id));
    if (index === -1) {
      return res.status(404).json({ error: "Audit item not found" });
    }

    const now = new Date().toISOString();
    const archivedItem = normalizeAuditItem({
      ...db.auditItems[index],
      archivedAt: now,
      archiveReason: item.archiveReason || "manual",
      archivedByEmail: manager.email,
      updatedAt: now,
      updatedByEmail: manager.email
    });
    db.auditItems[index] = archivedItem;
    saveDb(db);
    return res.json({ success: true, item: archivedItem });
  } else if (action === "restore") {
    const manager = requireEntryManager(req, res);
    if (!manager) return;

    if (!item?.id) {
      return res.status(400).json({ error: "Missing audit item id" });
    }

    const index = db.auditItems.findIndex((a: any) => a.id === String(item.id));
    if (index === -1) {
      return res.status(404).json({ error: "Audit item not found" });
    }

    const now = new Date().toISOString();
    const restoredItem = normalizeAuditItem({
      ...db.auditItems[index],
      archivedAt: undefined,
      archiveReason: undefined,
      archivedByEmail: undefined,
      updatedAt: now,
      updatedByEmail: manager.email
    });
    db.auditItems[index] = restoredItem;
    saveDb(db);
    return res.json({ success: true, item: restoredItem });
  } else if (action === "delete") {
    const manager = requireEntryManager(req, res);
    if (!manager) return;

    if (!item?.id) {
      return res.status(400).json({ error: "Missing audit item id" });
    }

    const index = db.auditItems.findIndex((a: any) => a.id === String(item.id));
    if (index === -1) {
      return res.status(404).json({ error: "Audit item not found" });
    }

    const now = new Date().toISOString();
    const archivedItem = normalizeAuditItem({
      ...db.auditItems[index],
      archivedAt: now,
      archiveReason: item.archiveReason || "manual",
      archivedByEmail: manager.email,
      updatedAt: now,
      updatedByEmail: manager.email
    });
    db.auditItems[index] = archivedItem;
    saveDb(db);
    return res.json({ success: true, item: archivedItem });
  }

  res.status(400).json({ error: "Invalid Action" });
});


// Express server hooks setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode - Mount standard Vite middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Social Media Team Dashboard running on port ${PORT}`);
  });
}

startServer();
