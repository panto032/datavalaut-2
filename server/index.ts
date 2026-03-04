import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import apiKeysRoutes from "./routes/api-keys.js";
import companiesRoutes from "./routes/companies.js";
import szRoutes from "./routes/sz.js";
import ngosRoutes from "./routes/ngos.js";
import financialRoutes from "./routes/financial.js";
import blokadeRoutes from "./routes/blokade.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3000");

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// API routes
app.use("/api/admin", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/api-keys", apiKeysRoutes);
app.use("/api/v1/companies", companiesRoutes);
app.use("/api/v1/sz", szRoutes);
app.use("/api/v1/ngos", ngosRoutes);
app.use("/api/v1/financial", financialRoutes);
app.use("/api/v1/blokade", blokadeRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


// Serve frontend in production
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
