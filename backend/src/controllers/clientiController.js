// Controller clienti: traduce richieste HTTP in chiamate al service
const clientiService = require("../services/clientiService");

const clientiController = {
  lista(req, res) {
    res.json(clientiService.lista());
  },

  crea(req, res) {
    const cliente = clientiService.crea(req.body.nome);
    res.status(201).json(cliente);
  },

  aggiorna(req, res) {
    res.json(clientiService.aggiorna(req.params.id, req.body.nome));
  },

  elimina(req, res) {
    res.json(clientiService.elimina(req.params.id));
  },
};

module.exports = clientiController;
