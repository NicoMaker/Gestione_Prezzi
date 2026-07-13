// Client HTTP centralizzato: tutte le chiamate al backend passano da qui

const API = "/api/attivita";
const STATS_API = "/api/stats";
const CLIENTI_API = "/api/clienti";

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function sendJson(url, method, body) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export const attivitaApi = {
  lista({ filtro, clienteIds }) {
    const params = new URLSearchParams();
    params.set("filtro", filtro);
    if (clienteIds.length > 0) params.set("cliente_id", clienteIds.join(","));
    return getJson(`${API}?${params.toString()}`);
  },
  crea(payload) {
    return sendJson(API, "POST", payload);
  },
  aggiorna(id, payload) {
    return sendJson(`${API}/${id}`, "PUT", payload);
  },
  togglePagato(id) {
    return fetch(`${API}/${id}/pagato`, { method: "PATCH" });
  },
  elimina(id) {
    return fetch(`${API}/${id}`, { method: "DELETE" });
  },
};

export const statsApi = {
  carica(clienteIds) {
    const params = new URLSearchParams();
    if (clienteIds.length > 0) params.set("cliente_id", clienteIds.join(","));
    return getJson(`${STATS_API}?${params.toString()}`);
  },
};

export const clientiApi = {
  lista() {
    return getJson(CLIENTI_API);
  },
  crea(nome) {
    return sendJson(CLIENTI_API, "POST", { nome });
  },
  aggiorna(id, nome) {
    return sendJson(`${CLIENTI_API}/${id}`, "PUT", { nome });
  },
  elimina(id) {
    return fetch(`${CLIENTI_API}/${id}`, { method: "DELETE" });
  },
};
