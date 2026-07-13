// Controller attività: traduce richieste HTTP in chiamate al service
const attivitaService = require("../services/attivitaService");

const attivitaController = {
  lista(req, res) {
    res.json(
      attivitaService.lista({
        filtro: req.query.filtro,
        clienteIdsRaw: req.query.cliente_id,
      }),
    );
  },

  statistiche(req, res) {
    res.json(attivitaService.statistiche(req.query.cliente_id));
  },

  dettaglio(req, res) {
    res.json(attivitaService.dettaglio(req.params.id));
  },

  crea(req, res) {
    res.status(201).json(attivitaService.crea(req.body));
  },

  aggiorna(req, res) {
    res.json(attivitaService.aggiorna(req.params.id, req.body));
  },

  togglePagato(req, res) {
    res.json(attivitaService.togglePagato(req.params.id, req.body.pagato));
  },

  elimina(req, res) {
    res.json(attivitaService.elimina(req.params.id));
  },
};

module.exports = attivitaController;
