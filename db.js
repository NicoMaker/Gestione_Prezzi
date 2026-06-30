const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'data', 'gestione.db');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS clienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    colore TEXT DEFAULT '#2563eb',
    creato_il TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS attivita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    data TEXT NOT NULL,
    descrizione TEXT NOT NULL,
    importo REAL NOT NULL DEFAULT 0,
    pagato INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    creato_il TEXT DEFAULT (datetime('now', 'localtime')),
    aggiornato_il TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (cliente_id) REFERENCES clienti(id)
  );
`);

// Migrazione per database gia' esistenti
const colonne = db.prepare("PRAGMA table_info(attivita)").all().map(c => c.name);
if (!colonne.includes('cliente_id')) {
  db.exec(`ALTER TABLE attivita ADD COLUMN cliente_id INTEGER REFERENCES clienti(id)`);
}

module.exports = db;
