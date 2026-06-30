const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

function rowToObj(row) {
  if (!row) return null;
  return {
    id: row.id,
    cliente_id: row.cliente_id || null,
    cliente_nome: row.cliente_nome || null,
    data: row.data,
    descrizione: row.descrizione,
    importo: row.importo,
    pagato: !!row.pagato,
    note: row.note || "",
    creato_il: row.creato_il,
    aggiornato_il: row.aggiornato_il,
  };
}

const SELECT_BASE = `
  SELECT a.*, c.nome AS cliente_nome
  FROM attivita a
  LEFT JOIN clienti c ON c.id = a.cliente_id
`;

// ===================== CLIENTI =====================

app.get("/api/clienti", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT c.*, 
      (SELECT COUNT(*) FROM attivita a WHERE a.cliente_id = c.id) AS num_attivita
    FROM clienti c ORDER BY c.nome ASC
  `,
    )
    .all();
  res.json(rows);
});

app.post("/api/clienti", (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim())
    return res.status(400).json({ errore: "Il nome cliente è obbligatorio" });
  try {
    const stmt = db.prepare(`INSERT INTO clienti (nome) VALUES (?)`);
    const result = stmt.run(nome.trim());
    const newRow = db
      .prepare("SELECT * FROM clienti WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json(newRow);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res
        .status(400)
        .json({ errore: "Esiste già un cliente con questo nome" });
    }
    res.status(500).json({ errore: "Errore creazione cliente" });
  }
});

app.put("/api/clienti/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM clienti WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ errore: "Cliente non trovato" });
  const nome =
    req.body.nome !== undefined ? req.body.nome.trim() : existing.nome;
  try {
    db.prepare(`UPDATE clienti SET nome = ? WHERE id = ?`).run(nome, id);
    res.json(db.prepare("SELECT * FROM clienti WHERE id = ?").get(id));
  } catch (err) {
    res.status(400).json({ errore: "Esiste già un cliente con questo nome" });
  }
});

app.delete("/api/clienti/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM clienti WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ errore: "Cliente non trovato" });

  const conteggio = db
    .prepare("SELECT COUNT(*) as n FROM attivita WHERE cliente_id = ?")
    .get(id);
  if (conteggio.n > 0) {
    return res.status(409).json({
      errore: `Impossibile eliminare: il cliente ha ${conteggio.n} attività collegate. Sposta o elimina prima quelle attività.`,
      attivita_collegate: conteggio.n,
    });
  }

  db.prepare("DELETE FROM clienti WHERE id = ?").run(id);
  res.json({ ok: true, id: Number(id) });
});

// ===================== ATTIVITA' =====================

// Helper: converte ?cliente_id=1,2,3 (o 'tutti'/vuoto) in array di ID numerici
function parseClienteIds(raw) {
  if (!raw || raw === "tutti") return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "" && s !== "tutti")
    .map(Number)
    .filter((n) => !isNaN(n));
}

// GET lista attivita, filtri: ?filtro=tutti|pagati|da_pagare & ?cliente_id=N,M,...
app.get("/api/attivita", (req, res) => {
  const filtro = req.query.filtro || "tutti";
  const clienteIds = parseClienteIds(req.query.cliente_id);

  let query = SELECT_BASE + " WHERE 1=1";
  const params = [];
  if (filtro === "pagati") query += " AND a.pagato = 1";
  else if (filtro === "da_pagare") query += " AND a.pagato = 0";
  if (clienteIds.length > 0) {
    query += ` AND a.cliente_id IN (${clienteIds.map(() => "?").join(",")})`;
    params.push(...clienteIds);
  }
  query += " ORDER BY c.nome ASC, a.data ASC, a.id ASC";

  const rows = db.prepare(query).all(...params);
  res.json(rows.map(rowToObj));
});

// GET statistiche totali, opzionalmente filtrate per uno o piu' clienti
app.get("/api/stats", (req, res) => {
  const clienteIds = parseClienteIds(req.query.cliente_id);
  const inClause =
    clienteIds.length > 0 ? `(${clienteIds.map(() => "?").join(",")})` : null;
  const filtroCliente = inClause ? ` WHERE cliente_id IN ${inClause}` : "";
  const filtroClienteAnd = inClause ? ` AND cliente_id IN ${inClause}` : "";
  const p = clienteIds.length > 0 ? clienteIds : [];

  const tutti = db
    .prepare(
      `SELECT COALESCE(SUM(importo),0) as tot FROM attivita${filtroCliente}`,
    )
    .get(...p);
  const pagati = db
    .prepare(
      `SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE pagato = 1${filtroClienteAnd}`,
    )
    .get(...p);
  const daPagare = db
    .prepare(
      `SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE pagato = 0${filtroClienteAnd}`,
    )
    .get(...p);
  const numTot = db
    .prepare(`SELECT COUNT(*) as n FROM attivita${filtroCliente}`)
    .get(...p);
  const numPagati = db
    .prepare(
      `SELECT COUNT(*) as n FROM attivita WHERE pagato = 1${filtroClienteAnd}`,
    )
    .get(...p);
  const numDaPagare = db
    .prepare(
      `SELECT COUNT(*) as n FROM attivita WHERE pagato = 0${filtroClienteAnd}`,
    )
    .get(...p);

  res.json({
    totale: tutti.tot,
    pagato: pagati.tot,
    da_pagare: daPagare.tot,
    numero_totale: numTot.n,
    numero_pagati: numPagati.n,
    numero_da_pagare: numDaPagare.n,
  });
});

app.get("/api/attivita/:id", (req, res) => {
  const row = db.prepare(SELECT_BASE + " WHERE a.id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ errore: "Riga non trovata" });
  res.json(rowToObj(row));
});

app.post("/api/attivita", (req, res) => {
  const { data, descrizione, importo, pagato, note, cliente_id } = req.body;

  if (
    !data ||
    !descrizione ||
    importo === undefined ||
    importo === null ||
    isNaN(Number(importo))
  ) {
    return res.status(400).json({
      errore: "Campi obbligatori: data, descrizione, importo (numerico)",
    });
  }

  const stmt = db.prepare(
    `INSERT INTO attivita (cliente_id, data, descrizione, importo, pagato, note) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const result = stmt.run(
    cliente_id || null,
    data,
    descrizione,
    Number(importo),
    pagato ? 1 : 0,
    note || "",
  );

  const newRow = db
    .prepare(SELECT_BASE + " WHERE a.id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(rowToObj(newRow));
});

app.put("/api/attivita/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM attivita WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ errore: "Riga non trovata" });

  const data = req.body.data ?? existing.data;
  const descrizione = req.body.descrizione ?? existing.descrizione;
  const importo =
    req.body.importo !== undefined && !isNaN(Number(req.body.importo))
      ? Number(req.body.importo)
      : existing.importo;
  const pagato =
    req.body.pagato !== undefined ? (req.body.pagato ? 1 : 0) : existing.pagato;
  const note = req.body.note !== undefined ? req.body.note : existing.note;
  const cliente_id =
    req.body.cliente_id !== undefined
      ? req.body.cliente_id || null
      : existing.cliente_id;

  db.prepare(
    `UPDATE attivita SET cliente_id = ?, data = ?, descrizione = ?, importo = ?, pagato = ?, note = ?, aggiornato_il = datetime('now','localtime') WHERE id = ?`,
  ).run(cliente_id, data, descrizione, importo, pagato, note, id);

  const updated = db.prepare(SELECT_BASE + " WHERE a.id = ?").get(id);
  res.json(rowToObj(updated));
});

app.patch("/api/attivita/:id/pagato", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM attivita WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ errore: "Riga non trovata" });

  const nuovoStato =
    req.body.pagato !== undefined
      ? req.body.pagato
        ? 1
        : 0
      : existing.pagato
        ? 0
        : 1;

  db.prepare(
    `UPDATE attivita SET pagato = ?, aggiornato_il = datetime('now','localtime') WHERE id = ?`,
  ).run(nuovoStato, id);

  const updated = db.prepare(SELECT_BASE + " WHERE a.id = ?").get(id);
  res.json(rowToObj(updated));
});

// DELETE elimina definitivamente l'attivita'
app.delete("/api/attivita/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM attivita WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ errore: "Riga non trovata" });

  db.prepare("DELETE FROM attivita WHERE id = ?").run(id);
  res.json({ ok: true, id: Number(id) });
});

// ===================== AVVIO SERVER =====================

function getLocalIP() {
  const interfacce = os.networkInterfaces();
  for (const nome of Object.keys(interfacce)) {
    for (const i of interfacce[nome]) {
      if (i.family === "IPv4" && !i.internal) {
        return i.address;
      }
    }
  }
  return "localhost";
}

async function getPublicIP() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return data.ip;
  } catch (err) {
    return "non disponibile (nessuna connessione internet?)";
  }
}

async function avvia() {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server avviato con successo!`);
    console.log(`🌐 IP Pubblico: http://${publicIP}:${PORT}`);
    console.log(`🏠 IP Locale:   http://${localIP}:${PORT}`);
    console.log(`📍 Localhost:   http://localhost:${PORT}`);
    console.log(`\n--------------------------------------`);
  });
}

avvia();
