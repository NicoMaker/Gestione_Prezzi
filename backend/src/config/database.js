// Connessione al database SQLite (node:sqlite nativo, Node >= 22.5)
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { applicaSchema } = require("./schema");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "gestione.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
applicaSchema(db);

module.exports = db;
