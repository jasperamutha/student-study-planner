const express = require("express");
const router = express.Router();
const db = require("../database");

/* ---------- GET all assignments (with optional filters) ---------- */
// Query params: ?search=text&status=Pending|In Progress|Completed
router.get("/", (req, res) => {
  const { search, status } = req.query;
  let sql = "SELECT * FROM assignments WHERE 1=1";
  const params = [];

  if (search) {
    sql += " AND (subject LIKE ? OR assignment LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== "All") {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY deadline ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ---------- GET single assignment ---------- */
router.get("/:id", (req, res) => {
  db.get("SELECT * FROM assignments WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Assignment not found" });
    res.json(row);
  });
});

/* ---------- ADD assignment ---------- */
router.post("/", (req, res) => {
  const { subject, assignment, deadline, status } = req.body;

  if (!subject || !assignment || !deadline) {
    return res.status(400).json({ error: "subject, assignment and deadline are required" });
  }
  const finalStatus = status || "Pending";

  db.run(
    "INSERT INTO assignments (subject, assignment, deadline, status) VALUES (?, ?, ?, ?)",
    [subject, assignment, deadline, finalStatus],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM assignments WHERE id = ?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(row);
      });
    }
  );
});

/* ---------- UPDATE assignment (full or status only) ---------- */
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { subject, assignment, deadline, status } = req.body;

  db.get("SELECT * FROM assignments WHERE id = ?", [id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!existing) return res.status(404).json({ error: "Assignment not found" });

    const updated = {
      subject: subject ?? existing.subject,
      assignment: assignment ?? existing.assignment,
      deadline: deadline ?? existing.deadline,
      status: status ?? existing.status,
    };

    db.run(
      "UPDATE assignments SET subject = ?, assignment = ?, deadline = ?, status = ? WHERE id = ?",
      [updated.subject, updated.assignment, updated.deadline, updated.status, id],
      function (e) {
        if (e) return res.status(500).json({ error: e.message });
        db.get("SELECT * FROM assignments WHERE id = ?", [id], (_e, row) => {
          if (_e) return res.status(500).json({ error: _e.message });
          res.json(row);
        });
      }
    );
  });
});

/* ---------- DELETE assignment ---------- */
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM assignments WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Assignment not found" });
    res.json({ message: "Assignment deleted", id: Number(req.params.id) });
  });
});

module.exports = router;