// Repository attività: unico punto di accesso alla tabella `attivita`
const db = require("../config/database");

const SELECT_BASE = `
  SELECT a.*, c.nome AS cliente_nome
  FROM attivita a
  LEFT JOIN clienti c ON c.id = a.cliente_id
`;

function inClause(ids) {
  return `(${ids.map(() => "?").join(",")})`;
}

const attivitaRepository = {
  trovaConFiltri({ filtro = "tutti", clienteIds = [] } = {}) {
    let query = SELECT_BASE + " WHERE 1=1";
    const params = [];
    if (filtro === "pagati") query += " AND a.pagato = 1";
    else if (filtro === "da_pagare") query += " AND a.pagato = 0";
    if (clienteIds.length > 0) {
      query += ` AND a.cliente_id IN ${inClause(clienteIds)}`;
      params.push(...clienteIds);
    }
    query += " ORDER BY c.nome ASC, a.data ASC, a.id ASC";
    return db.prepare(query).all(...params);
  },

  trovaPerId(id) {
    return db.prepare(SELECT_BASE + " WHERE a.id = ?").get(id);
  },

  trovaGrezzaPerId(id) {
    return db.prepare("SELECT * FROM attivita WHERE id = ?").get(id);
  },

  crea({ cliente_id, data, descrizione, importo, pagato, note }) {
    const result = db
      .prepare(
        `INSERT INTO attivita (cliente_id, data, descrizione, importo, pagato, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(cliente_id, data, descrizione, importo, pagato, note);
    return this.trovaPerId(result.lastInsertRowid);
  },

  aggiorna(id, { cliente_id, data, descrizione, importo, pagato, note }) {
    db.prepare(
      `UPDATE attivita
       SET cliente_id = ?, data = ?, descrizione = ?, importo = ?, pagato = ?, note = ?,
           aggiornato_il = datetime('now','localtime')
       WHERE id = ?`,
    ).run(cliente_id, data, descrizione, importo, pagato, note, id);
    return this.trovaPerId(id);
  },

  aggiornaPagato(id, pagato) {
    db.prepare(
      `UPDATE attivita SET pagato = ?, aggiornato_il = datetime('now','localtime') WHERE id = ?`,
    ).run(pagato, id);
    return this.trovaPerId(id);
  },

  elimina(id) {
    db.prepare("DELETE FROM attivita WHERE id = ?").run(id);
  },

  statistiche(clienteIds = []) {
    const has = clienteIds.length > 0;
    const where = has ? ` WHERE cliente_id IN ${inClause(clienteIds)}` : "";
    const and = has ? ` AND cliente_id IN ${inClause(clienteIds)}` : "";
    const p = has ? clienteIds : [];

    const somma = (sql) => db.prepare(sql).get(...p);

    return {
      totale: somma(`SELECT COALESCE(SUM(importo),0) as tot FROM attivita${where}`).tot,
      pagato: somma(`SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE pagato = 1${and}`).tot,
      da_pagare: somma(`SELECT COALESCE(SUM(importo),0) as tot FROM attivita WHERE pagato = 0${and}`).tot,
      numero_totale: somma(`SELECT COUNT(*) as n FROM attivita${where}`).n,
      numero_pagati: somma(`SELECT COUNT(*) as n FROM attivita WHERE pagato = 1${and}`).n,
      numero_da_pagare: somma(`SELECT COUNT(*) as n FROM attivita WHERE pagato = 0${and}`).n,
    };
  },
};

module.exports = attivitaRepository;
