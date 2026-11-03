const express = require("express");
const cors = require("cors");
const path = require("path");
const assignmentRoutes = require("./routes/assignmentRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- API routes ---------- */
app.use("/api/assignments", assignmentRoutes);

/* ---------- Serve frontend ---------- */
app.use(express.static(__dirname));

/* ---------- Fallback ---------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});