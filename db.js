const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'data', 'gestione.db');

// Crea la cartella data se non esiste
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const isNewDb = !fs.existsSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS attivita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    descrizione TEXT NOT NULL,
    importo REAL NOT NULL DEFAULT 0,
    pagato INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    creato_il TEXT DEFAULT (datetime('now', 'localtime')),
    aggiornato_il TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Dati iniziali presi dalla tabella fornita dall'utente (solo alla prima creazione del DB)
if (isNewDb) {
  const seed = [
  ];

  const insert = db.prepare(
    `INSERT INTO attivita (data, descrizione, importo, pagato) VALUES (?, ?, ?, ?)`
  );
  for (const row of seed) {
    insert.run(...row);
  }
  console.log(`Database creato e popolato con ${seed.length} righe iniziali in ${DB_PATH}`);
}

module.exports = db;
