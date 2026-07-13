// Definizione dello schema e migrazioni per database esistenti

function applicaSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clienti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
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

  eseguiMigrazioni(db);
}

function eseguiMigrazioni(db) {
  const colonneAttivita = db
    .prepare("PRAGMA table_info(attivita)")
    .all()
    .map((c) => c.name);

  if (!colonneAttivita.includes("cliente_id")) {
    db.exec(
      `ALTER TABLE attivita ADD COLUMN cliente_id INTEGER REFERENCES clienti(id)`,
    );
  }
}

module.exports = { applicaSchema };
