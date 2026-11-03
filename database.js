const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "assignments.db"));

db.run(`
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    assignment TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'Pending'
)
`);

module.exports = db;
