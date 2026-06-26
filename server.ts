import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

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
app.get("/api/dashboard-data", (req, res) => {
  const db = getDb();
  res.json(db);
});

// API: Save content audit record
app.post("/api/audit", (req, res) => {
  const { action, item } = req.body;
  const db = getDb();
  const normalizeAuditItem = (record: any) => ({
    ...record,
    id: String(record.id || `aud-${Date.now()}`),
    title: String(record.title || "").trim(),
    platform: ["facebook", "instagram", "youtube"].includes(record.platform) ? record.platform : "instagram",
    format: String(record.format || "reel"),
    publishedAt: String(record.publishedAt || new Date().toISOString().slice(0, 10)),
    views: Number(record.views) || 0,
    likes: Number(record.likes) || 0,
    comments: Number(record.comments) || 0,
    shares: Number(record.shares) || 0,
    author: String(record.author || "Unknown Contributor").trim(),
    state: record.state ? String(record.state) : undefined,
    page: record.page ? String(record.page) : undefined,
    theme: record.theme === "negative" ? "negative" : "positive"
  });

  if (action === "create") {
    const newItem = normalizeAuditItem({ ...item, id: "aud-" + Date.now() });
    db.auditItems.push(newItem);
    saveDb(db);
    return res.json({ success: true, item: newItem });
  } else if (action === "update") {
    if (!item?.id) {
      return res.status(400).json({ error: "Missing audit item id" });
    }

    const index = db.auditItems.findIndex((a: any) => a.id === item.id);
    if (index === -1) {
      return res.status(404).json({ error: "Audit item not found" });
    }

    const updatedItem = normalizeAuditItem({ ...db.auditItems[index], ...item });
    db.auditItems[index] = updatedItem;
    saveDb(db);
    return res.json({ success: true, item: updatedItem });
  } else if (action === "delete") {
    if (!item?.id) {
      return res.status(400).json({ error: "Missing audit item id" });
    }

    db.auditItems = db.auditItems.filter((a: any) => a.id !== item.id);
    saveDb(db);
    return res.json({ success: true });
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
