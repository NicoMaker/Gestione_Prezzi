const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function rowToObj(row) {
  if (!row) return null;
  return {
    id: row.id,
    data: row.data,
    descrizione: row.descrizione,
    importo: row.importo,
    pagato: !!row.pagato,
    note: row.note || '',
    creato_il: row.creato_il,
    aggiornato_il: row.aggiornato_il,
  };
}

// GET lista attivita, con filtro opzionale ?filtro=tutti|pagati|da_pagare
app.get('/api/attivita', (req, res) => {
  const filtro = req.query.filtro || 'tutti';
  let query = 'SELECT * FROM attivita';
  if (filtro === 'pagati') query += ' WHERE pagato = 1';
  else if (filtro === 'da_pagare') query += ' WHERE pagato = 0';
  query += ' ORDER BY data ASC, id ASC';

  const rows = db.prepare(query).all();
  res.json(rows.map(rowToObj));
});

// GET statistiche totali
app.get('/api/stats', (req, res) => {
  const tutti = db.prepare('SELECT COALESCE(SUM(importo),0) as tot FROM attivita').get();
  const pagati = db.prepare('SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE pagato = 1').get();
  const daPagare = db.prepare('SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE pagato = 0').get();
  const numTot = db.prepare('SELECT COUNT(*) as n FROM attivita').get();
  const numPagati = db.prepare('SELECT COUNT(*) as n FROM attivita WHERE pagato = 1').get();
  const numDaPagare = db.prepare('SELECT COUNT(*) as n FROM attivita WHERE pagato = 0').get();

  res.json({
    totale: tutti.tot,
    pagato: pagati.tot,
    da_pagare: daPagare.tot,
    numero_totale: numTot.n,
    numero_pagati: numPagati.n,
    numero_da_pagare: numDaPagare.n,
  });
});

// GET singola riga
app.get('/api/attivita/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM attivita WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ errore: 'Riga non trovata' });
  res.json(rowToObj(row));
});

// POST crea nuova riga
app.post('/api/attivita', (req, res) => {
  const { data, descrizione, importo, pagato, note } = req.body;

  if (!data || !descrizione || importo === undefined || importo === null) {
    return res.status(400).json({ errore: 'Campi obbligatori: data, descrizione, importo' });
  }

  const stmt = db.prepare(
    `INSERT INTO attivita (data, descrizione, importo, pagato, note) VALUES (?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    data,
    descrizione,
    Number(importo),
    pagato ? 1 : 0,
    note || ''
  );

  const newRow = db.prepare('SELECT * FROM attivita WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(rowToObj(newRow));
});

// PUT aggiorna riga esistente (dati completi)
app.put('/api/attivita/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attivita WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ errore: 'Riga non trovata' });

  const data = req.body.data ?? existing.data;
  const descrizione = req.body.descrizione ?? existing.descrizione;
  const importo = req.body.importo !== undefined ? Number(req.body.importo) : existing.importo;
  const pagato = req.body.pagato !== undefined ? (req.body.pagato ? 1 : 0) : existing.pagato;
  const note = req.body.note !== undefined ? req.body.note : existing.note;

  db.prepare(
    `UPDATE attivita SET data = ?, descrizione = ?, importo = ?, pagato = ?, note = ?, aggiornato_il = datetime('now','localtime') WHERE id = ?`
  ).run(data, descrizione, importo, pagato, note, id);

  const updated = db.prepare('SELECT * FROM attivita WHERE id = ?').get(id);
  res.json(rowToObj(updated));
});

// PATCH cambia solo stato pagato/non pagato (toggle automatico)
app.patch('/api/attivita/:id/pagato', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attivita WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ errore: 'Riga non trovata' });

  const nuovoStato = req.body.pagato !== undefined ? (req.body.pagato ? 1 : 0) : (existing.pagato ? 0 : 1);

  db.prepare(
    `UPDATE attivita SET pagato = ?, aggiornato_il = datetime('now','localtime') WHERE id = ?`
  ).run(nuovoStato, id);

  const updated = db.prepare('SELECT * FROM attivita WHERE id = ?').get(id);
  res.json(rowToObj(updated));
});

// DELETE elimina riga
app.delete('/api/attivita/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attivita WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ errore: 'Riga non trovata' });

  db.prepare('DELETE FROM attivita WHERE id = ?').run(id);
  res.json({ ok: true, id: Number(id) });
});

app.listen(PORT, () => {
  console.log(`\n  Gestione Pagamenti avviata!`);
  console.log(`  Apri il browser su: http://localhost:${PORT}\n`);
});
