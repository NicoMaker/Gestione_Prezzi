// Repository clienti: unico punto di accesso alla tabella `clienti`
const db = require("../config/database");

const clientiRepository = {
  trovaTutti() {
    return db
      .prepare(
        `
        SELECT c.*,
          (SELECT COUNT(*) FROM attivita a WHERE a.cliente_id = c.id) AS num_attivita
        FROM clienti c ORDER BY c.nome ASC
      `,
      )
      .all();
  },

  trovaPerId(id) {
    return db.prepare("SELECT * FROM clienti WHERE id = ?").get(id);
  },

  crea(nome) {
    const result = db.prepare(`INSERT INTO clienti (nome) VALUES (?)`).run(nome);
    return this.trovaPerId(result.lastInsertRowid);
  },

  aggiornaNome(id, nome) {
    db.prepare(`UPDATE clienti SET nome = ? WHERE id = ?`).run(nome, id);
    return this.trovaPerId(id);
  },

  elimina(id) {
    db.prepare("DELETE FROM clienti WHERE id = ?").run(id);
  },

  contaAttivitaCollegate(id) {
    return db
      .prepare("SELECT COUNT(*) as n FROM attivita WHERE cliente_id = ?")
      .get(id).n;
  },
};

module.exports = clientiRepository;
