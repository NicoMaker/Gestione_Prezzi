// Service clienti: validazione e regole di business
const repo = require("../repositories/clientiRepository");
const { HttpError } = require("../middleware/errorHandler");

const clientiService = {
  lista() {
    return repo.trovaTutti();
  },

  crea(nome) {
    if (!nome || !nome.trim()) {
      throw new HttpError(400, "Il nome cliente è obbligatorio");
    }
    try {
      return repo.crea(nome.trim());
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) {
        throw new HttpError(400, "Esiste già un cliente con questo nome");
      }
      throw new HttpError(500, "Errore creazione cliente");
    }
  },

  aggiorna(id, nomeNuovo) {
    const existing = repo.trovaPerId(id);
    if (!existing) throw new HttpError(404, "Cliente non trovato");
    const nome = nomeNuovo !== undefined ? nomeNuovo.trim() : existing.nome;
    try {
      return repo.aggiornaNome(id, nome);
    } catch (err) {
      throw new HttpError(400, "Esiste già un cliente con questo nome");
    }
  },

  elimina(id) {
    const existing = repo.trovaPerId(id);
    if (!existing) throw new HttpError(404, "Cliente non trovato");

    const collegate = repo.contaAttivitaCollegate(id);
    if (collegate > 0) {
      throw new HttpError(
        409,
        `Impossibile eliminare: il cliente ha ${collegate} attività collegate. Sposta o elimina prima quelle attività.`,
        { attivita_collegate: collegate },
      );
    }

    repo.elimina(id);
    return { ok: true, id: Number(id) };
  },
};

module.exports = clientiService;
