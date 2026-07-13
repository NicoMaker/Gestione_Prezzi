// Service attività: validazione, mapping e regole di business
const repo = require("../repositories/attivitaRepository");
const { HttpError } = require("../middleware/errorHandler");

// Converte una riga DB nell'oggetto esposto dalle API
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

// Converte ?cliente_id=1,2,3 (o 'tutti'/vuoto) in array di ID numerici
function parseClienteIds(raw) {
  if (!raw || raw === "tutti") return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "" && s !== "tutti")
    .map(Number)
    .filter((n) => !isNaN(n));
}

const attivitaService = {
  parseClienteIds,

  lista({ filtro, clienteIdsRaw }) {
    const rows = repo.trovaConFiltri({
      filtro: filtro || "tutti",
      clienteIds: parseClienteIds(clienteIdsRaw),
    });
    return rows.map(rowToObj);
  },

  dettaglio(id) {
    const row = repo.trovaPerId(id);
    if (!row) throw new HttpError(404, "Riga non trovata");
    return rowToObj(row);
  },

  crea(body) {
    const { data, descrizione, importo, pagato, note, cliente_id } = body;
    if (
      !data ||
      !descrizione ||
      importo === undefined ||
      importo === null ||
      isNaN(Number(importo))
    ) {
      throw new HttpError(
        400,
        "Campi obbligatori: data, descrizione, importo (numerico)",
      );
    }

    const nuova = repo.crea({
      cliente_id: cliente_id || null,
      data,
      descrizione,
      importo: Number(importo),
      pagato: pagato ? 1 : 0,
      note: note || "",
    });
    return rowToObj(nuova);
  },

  aggiorna(id, body) {
    const existing = repo.trovaGrezzaPerId(id);
    if (!existing) throw new HttpError(404, "Riga non trovata");

    const aggiornata = repo.aggiorna(id, {
      data: body.data ?? existing.data,
      descrizione: body.descrizione ?? existing.descrizione,
      importo:
        body.importo !== undefined && !isNaN(Number(body.importo))
          ? Number(body.importo)
          : existing.importo,
      pagato:
        body.pagato !== undefined ? (body.pagato ? 1 : 0) : existing.pagato,
      note: body.note !== undefined ? body.note : existing.note,
      cliente_id:
        body.cliente_id !== undefined
          ? body.cliente_id || null
          : existing.cliente_id,
    });
    return rowToObj(aggiornata);
  },

  togglePagato(id, pagatoRichiesto) {
    const existing = repo.trovaGrezzaPerId(id);
    if (!existing) throw new HttpError(404, "Riga non trovata");

    const nuovoStato =
      pagatoRichiesto !== undefined
        ? pagatoRichiesto
          ? 1
          : 0
        : existing.pagato
          ? 0
          : 1;

    return rowToObj(repo.aggiornaPagato(id, nuovoStato));
  },

  elimina(id) {
    const existing = repo.trovaGrezzaPerId(id);
    if (!existing) throw new HttpError(404, "Riga non trovata");
    repo.elimina(id);
    return { ok: true, id: Number(id) };
  },

  statistiche(clienteIdsRaw) {
    return repo.statistiche(parseClienteIds(clienteIdsRaw));
  },
};

module.exports = attivitaService;
