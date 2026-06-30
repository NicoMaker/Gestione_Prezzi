const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Dopo quanti giorni nel cestino un elemento viene eliminato definitivamente
const GIORNI_CONSERVAZIONE_CESTINO = 30;

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
    eliminato: !!row.eliminato,
    eliminato_il: row.eliminato_il,
    creato_il: row.creato_il,
    aggiornato_il: row.aggiornato_il,
  };
}

// ===================== ATTIVITA' =====================

// GET lista attivita (esclude quelle nel cestino), con filtro opzionale ?filtro=tutti|pagati|da_pagare
app.get('/api/attivita', (req, res) => {
  const filtro = req.query.filtro || 'tutti';
  let query = 'SELECT * FROM attivita WHERE eliminato = 0';
  if (filtro === 'pagati') query += ' AND pagato = 1';
  else if (filtro === 'da_pagare') query += ' AND pagato = 0';
  query += ' ORDER BY data ASC, id ASC';

  const rows = db.prepare(query).all();
  res.json(rows.map(rowToObj));
});

// GET statistiche totali (solo elementi non nel cestino)
app.get('/api/stats', (req, res) => {
  const tutti = db.prepare('SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE eliminato = 0').get();
  const pagati = db.prepare('SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE eliminato = 0 AND pagato = 1').get();
  const daPagare = db.prepare('SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE eliminato = 0 AND pagato = 0').get();
  const numTot = db.prepare('SELECT COUNT(*) as n FROM attivita WHERE eliminato = 0').get();
  const numPagati = db.prepare('SELECT COUNT(*) as n FROM attivita WHERE eliminato = 0 AND pagato = 1').get();
  const numDaPagare = db.prepare('SELECT COUNT(*) as n FROM attivita WHERE eliminato = 0 AND pagato = 0').get();
  const numCestino = db.prepare('SELECT COUNT(*) as n FROM attivita WHERE eliminato = 1').get();

  res.json({
    totale: tutti.tot,
    pagato: pagati.tot,
    da_pagare: daPagare.tot,
    numero_totale: numTot.n,
    numero_pagati: numPagati.n,
    numero_da_pagare: numDaPagare.n,
    numero_cestino: numCestino.n,
  });
});

// GET singola riga
app.get('/api/attivita/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM attivita WHERE id = ? AND eliminato = 0').get(req.params.id);
  if (!row) return res.status(404).json({ errore: 'Riga non trovata' });
  res.json(rowToObj(row));
});

// POST crea nuova riga
app.post('/api/attivita', (req, res) => {
  const { data, descrizione, importo, pagato, note } = req.body;

  if (!data || !descrizione || importo === undefined || importo === null || isNaN(Number(importo))) {
    return res.status(400).json({ errore: 'Campi obbligatori: data, descrizione, importo (numerico)' });
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
  const importo = req.body.importo !== undefined && !isNaN(Number(req.body.importo)) ? Number(req.body.importo) : existing.importo;
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

// DELETE -> sposta nel cestino (eliminazione "soft", non cancella subito dal database)
app.delete('/api/attivita/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attivita WHERE id = ? AND eliminato = 0').get(id);
  if (!existing) return res.status(404).json({ errore: 'Riga non trovata' });

  db.prepare(
    `UPDATE attivita SET eliminato = 1, eliminato_il = datetime('now','localtime') WHERE id = ?`
  ).run(id);

  res.json({ ok: true, id: Number(id), spostato_nel_cestino: true });
});

// ===================== CESTINO =====================

// GET elenco elementi nel cestino
app.get('/api/cestino', (req, res) => {
  const rows = db.prepare('SELECT * FROM attivita WHERE eliminato = 1 ORDER BY eliminato_il DESC').all();
  res.json(rows.map(rowToObj));
});

// POST ripristina un elemento dal cestino
app.post('/api/cestino/:id/ripristina', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attivita WHERE id = ? AND eliminato = 1').get(id);
  if (!existing) return res.status(404).json({ errore: 'Elemento non trovato nel cestino' });

  db.prepare(
    `UPDATE attivita SET eliminato = 0, eliminato_il = NULL, aggiornato_il = datetime('now','localtime') WHERE id = ?`
  ).run(id);

  const updated = db.prepare('SELECT * FROM attivita WHERE id = ?').get(id);
  res.json(rowToObj(updated));
});

// DELETE elimina definitivamente un singolo elemento dal cestino
app.delete('/api/cestino/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM attivita WHERE id = ? AND eliminato = 1').get(id);
  if (!existing) return res.status(404).json({ errore: 'Elemento non trovato nel cestino' });

  db.prepare('DELETE FROM attivita WHERE id = ?').run(id);
  res.json({ ok: true, id: Number(id) });
});

// DELETE svuota completamente il cestino
app.delete('/api/cestino', (req, res) => {
  const result = db.prepare('DELETE FROM attivita WHERE eliminato = 1').run();
  res.json({ ok: true, eliminati: result.changes });
});

// ===================== CRON: pulizia automatica cestino =====================
// Ogni notte alle 00:00 elimina definitivamente dal cestino gli elementi
// piu' vecchi di GIORNI_CONSERVAZIONE_CESTINO giorni.
function pulisciCestinoVecchio() {
  const result = db.prepare(
    `DELETE FROM attivita WHERE eliminato = 1 AND eliminato_il <= datetime('now','localtime', ?)`
  ).run(`-${GIORNI_CONSERVAZIONE_CESTINO} days`);
  if (result.changes > 0) {
    console.log(`🧹 Cestino: eliminati definitivamente ${result.changes} elementi piu' vecchi di ${GIORNI_CONSERVAZIONE_CESTINO} giorni`);
  }
}

cron.schedule('0 0 * * *', () => {
  console.log('⏰ Esecuzione pulizia automatica del cestino (00:00)...');
  pulisciCestinoVecchio();
});

// ===================== AVVIO SERVER =====================

function getLocalIP() {
  const interfacce = os.networkInterfaces();
  for (const nome of Object.keys(interfacce)) {
    for (const i of interfacce[nome]) {
      if (i.family === 'IPv4' && !i.internal) {
        return i.address;
      }
    }
  }
  return 'localhost';
}

async function getPublicIP() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    return data.ip;
  } catch (err) {
    return 'non disponibile (nessuna connessione internet?)';
  }
}

async function avvia() {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server avviato con successo!`);
    console.log(`🌐 IP Pubblico: http://${publicIP}:${PORT}`);
    console.log(`🏠 IP Locale:   http://${localIP}:${PORT}`);
    console.log(`📍 Localhost:   http://localhost:${PORT}`);
    console.log(`\n--------------------------------------`);
    console.log(
      `⏰ Cron cestino attivo: eliminazione automatica ogni notte alle 00:00 (elementi piu' vecchi di ${GIORNI_CONSERVAZIONE_CESTINO} giorni)`
    );
  });
}

avvia();
