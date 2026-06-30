const API = "/api/attivita";
const STATS_API = "/api/stats";
const CLIENTI_API = "/api/clienti";

let filtroStato = "tutti";
let filtroClienteId = "tutti";
let testoCerca = "";
let datiCorrenti = [];
let clientiCorrenti = [];

const contenitoreGruppi = document.getElementById("contenitoreGruppi");
const vuotoMsg = document.getElementById("vuoto");

// ---------- Utility numeri / valute (formato italiano: punto migliaia, virgola decimali) ----------

function parseImportoIT(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim();
  if (s === "") return NaN;
  s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

function formattaImportoInput(numero) {
  return Number(numero).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formattaEuro(numero) {
  return (
    "€ " +
    Number(numero).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formattaDataIT(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function mostraToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Formattazione live dell'importo mentre si scrive ----------
function formattaImportoLive(raw) {
  let s = String(raw).replace(/[^0-9,]/g, "");
  const primaVirgola = s.indexOf(",");
  if (primaVirgola !== -1) {
    s =
      s.slice(0, primaVirgola + 1) +
      s.slice(primaVirgola + 1).replace(/,/g, "");
  }
  let [intPart, decPart] = s.split(",");
  intPart = intPart || "";
  intPart = intPart.replace(/^0+(?=\d)/, "");
  const intFormattata = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decPart !== undefined) {
    decPart = decPart.slice(0, 2);
    return intFormattata + "," + decPart;
  }
  return intFormattata;
}

function collegaImportoLive(input) {
  input.addEventListener("input", () => {
    const valorePrecedente = input.value;
    const cursorDaFine = valorePrecedente.length - input.selectionStart;
    const nuovoValore = formattaImportoLive(valorePrecedente);
    input.value = nuovoValore;
    const nuovaPosizione = Math.max(0, nuovoValore.length - cursorDaFine);
    input.setSelectionRange(nuovaPosizione, nuovaPosizione);
  });
  input.addEventListener("blur", () => {
    const valore = parseImportoIT(input.value);
    if (!isNaN(valore)) {
      input.value = formattaImportoInput(valore);
    }
  });
}

// ---------- Componente combobox cercabile per i clienti ----------
function creaComboCliente(
  containerId,
  inputId,
  hiddenId,
  listId,
  { opzioneTutti = false, onChange = null } = {},
) {
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const lista = document.getElementById(listId);

  function opzioni() {
    const arr = clientiCorrenti.map((c) => ({
      id: String(c.id),
      nome: c.nome,
    }));
    if (opzioneTutti) arr.unshift({ id: "tutti", nome: "Tutti i clienti" });
    return arr;
  }

  function renderLista(filtro) {
    const q = (filtro || "").trim().toLowerCase();
    const filtrate = opzioni().filter((o) => o.nome.toLowerCase().includes(q));
    lista.innerHTML = "";
    if (filtrate.length === 0) {
      lista.innerHTML =
        '<div class="combo-item combo-item-vuoto">Nessun cliente trovato</div>';
    } else {
      for (const o of filtrate) {
        const div = document.createElement("div");
        div.className = "combo-item";
        div.textContent = o.nome;
        div.dataset.id = o.id;
        if (String(hidden.value) === o.id) div.classList.add("selezionato");
        div.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selezionaValore(o.id, o.nome);
        });
        lista.appendChild(div);
      }
    }
    lista.classList.remove("hidden");
  }

  function selezionaValore(id, nome) {
    hidden.value = id;
    input.value = id === "tutti" ? "" : nome;
    lista.classList.add("hidden");
    if (onChange) onChange(id);
  }

  input.addEventListener("focus", () => renderLista(""));
  input.addEventListener("input", () => renderLista(input.value));
  input.addEventListener("blur", () => {
    setTimeout(() => {
      lista.classList.add("hidden");
      const corrente = opzioni().find((o) => o.id === String(hidden.value));
      input.value = corrente
        ? corrente.id === "tutti"
          ? ""
          : corrente.nome
        : "";
    }, 120);
  });
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) lista.classList.add("hidden");
  });

  return {
    setValore(id) {
      const corrente = opzioni().find((o) => o.id === String(id));
      hidden.value = id || (opzioneTutti ? "tutti" : "");
      input.value = corrente
        ? corrente.id === "tutti"
          ? ""
          : corrente.nome
        : "";
    },
    refresh() {
      const idAttuale = hidden.value;
      const corrente = opzioni().find((o) => o.id === String(idAttuale));
      input.value = corrente
        ? corrente.id === "tutti"
          ? ""
          : corrente.nome
        : input.value;
    },
    getValore() {
      return hidden.value;
    },
  };
}

let comboFiltroCliente, comboFormCliente;

// ---------- Caricamento clienti ----------
async function caricaClienti() {
  const res = await fetch(CLIENTI_API);
  clientiCorrenti = await res.json();
  if (comboFiltroCliente) comboFiltroCliente.refresh();
  if (comboFormCliente) comboFormCliente.refresh();
}

// ---------- Caricamento dati ----------
async function caricaStats() {
  const params = new URLSearchParams();
  if (filtroClienteId !== "tutti") params.set("cliente_id", filtroClienteId);
  const res = await fetch(`${STATS_API}?${params.toString()}`);
  const stats = await res.json();
  document.getElementById("statTotale").textContent = formattaEuro(
    stats.totale,
  );
  document.getElementById("statTotaleNum").textContent =
    `${stats.numero_totale} voci`;
  document.getElementById("statPagato").textContent = formattaEuro(
    stats.pagato,
  );
  document.getElementById("statPagatoNum").textContent =
    `${stats.numero_pagati} voci`;
  document.getElementById("statDaPagare").textContent = formattaEuro(
    stats.da_pagare,
  );
  document.getElementById("statDaPagareNum").textContent =
    `${stats.numero_da_pagare} voci`;

  // Percentuali
  const totale = stats.totale;
  if (totale > 0) {
    const percPagato = ((stats.pagato / totale) * 100).toFixed(1);
    const percDaPagare = ((stats.da_pagare / totale) * 100).toFixed(1);
    document.getElementById("statPagatoPerc").textContent = `(${percPagato}%)`;
    document.getElementById("statDaPagarePerc").textContent = `(${percDaPagare}%)`;
  } else {
    document.getElementById("statPagatoPerc").textContent = "(0%)";
    document.getElementById("statDaPagarePerc").textContent = "(0%)";
  }
}

async function caricaTabella() {
  const params = new URLSearchParams();
  params.set("filtro", filtroStato);
  if (filtroClienteId !== "tutti") params.set("cliente_id", filtroClienteId);

  const res = await fetch(`${API}?${params.toString()}`);
  let dati = await res.json();

  if (testoCerca.trim()) {
    const q = testoCerca.trim().toLowerCase();
    dati = dati.filter(
      (r) =>
        r.descrizione.toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q),
    );
  }

  datiCorrenti = dati;
  renderGruppi(dati);
  aggiornaTotaleVisualizzato(dati);
}

function aggiornaTotaleVisualizzato(dati) {
  const pagati = dati.filter((r) => r.pagato);
  const daPagare = dati.filter((r) => !r.pagato);

  const somma = dati.reduce((acc, r) => acc + Number(r.importo), 0);
  const sommaPagato = pagati.reduce((acc, r) => acc + Number(r.importo), 0);
  const sommaDaPagare = daPagare.reduce((acc, r) => acc + Number(r.importo), 0);

  document.getElementById("footTotale").textContent = formattaEuro(somma);
  document.getElementById("footTotaleNum").textContent = `${dati.length} voci`;
  document.getElementById("footPagato").textContent = formattaEuro(sommaPagato);
  document.getElementById("footPagatoNum").textContent =
    `${pagati.length} voci`;
  document.getElementById("footDaPagare").textContent =
    formattaEuro(sommaDaPagare);
  document.getElementById("footDaPagareNum").textContent =
    `${daPagare.length} voci`;

  // Percentuali per il footer
  if (somma > 0) {
    const percPagato = ((sommaPagato / somma) * 100).toFixed(1);
    const percDaPagare = ((sommaDaPagare / somma) * 100).toFixed(1);
    document.getElementById("footPagatoPerc").textContent = `(${percPagato}%)`;
    document.getElementById("footDaPagarePerc").textContent = `(${percDaPagare}%)`;
  } else {
    document.getElementById("footPagatoPerc").textContent = "(0%)";
    document.getElementById("footDaPagarePerc").textContent = "(0%)";
  }
}

function raggruppaPerCliente(dati) {
  const gruppi = new Map();
  for (const riga of dati) {
    const chiave = riga.cliente_id || "senza";
    if (!gruppi.has(chiave)) {
      gruppi.set(chiave, {
        nome: riga.cliente_nome || "Senza cliente",
        righe: [],
      });
    }
    gruppi.get(chiave).righe.push(riga);
  }
  return [...gruppi.entries()].sort((a, b) =>
    a[1].nome.localeCompare(b[1].nome, "it"),
  );
}

function renderGruppi(dati) {
  contenitoreGruppi.innerHTML = "";

  if (dati.length === 0) {
    vuotoMsg.classList.remove("hidden");
    return;
  }
  vuotoMsg.classList.add("hidden");

  const gruppi = raggruppaPerCliente(dati);

  for (const [chiave, gruppo] of gruppi) {
    const sommaGruppo = gruppo.righe.reduce(
      (acc, r) => acc + Number(r.importo),
      0,
    );
    const pagatiGruppo = gruppo.righe.filter((r) => r.pagato);
    const daPagareGruppo = gruppo.righe.filter((r) => !r.pagato);
    const sommaPagatoGruppo = pagatiGruppo.reduce(
      (acc, r) => acc + Number(r.importo),
      0,
    );
    const sommaDaPagareGruppo = daPagareGruppo.reduce(
      (acc, r) => acc + Number(r.importo),
      0,
    );

    // Calcolo percentuali per questo cliente
    let percPagato = "0%", percDaPagare = "0%";
    if (sommaGruppo > 0) {
      percPagato = ((sommaPagatoGruppo / sommaGruppo) * 100).toFixed(1) + "%";
      percDaPagare = ((sommaDaPagareGruppo / sommaGruppo) * 100).toFixed(1) + "%";
    }

    const sezione = document.createElement("section");
    sezione.className = "gruppo-cliente";
    sezione.innerHTML = `
      <div class="gruppo-header">
        <h3>${escapeHtml(gruppo.nome)}</h3>
        <span class="gruppo-conteggio">${gruppo.righe.length} attività</span>
        <span class="gruppo-chip gruppo-chip-pagato" title="Pagato">✅ ${formattaEuro(sommaPagatoGruppo)} <small>(${pagatiGruppo.length})</small> <span class="gruppo-perc">${percPagato}</span></span>
        <span class="gruppo-chip gruppo-chip-dapagare" title="Da pagare">⏳ ${formattaEuro(sommaDaPagareGruppo)} <small>(${daPagareGruppo.length})</small> <span class="gruppo-perc">${percDaPagare}</span></span>
        <span class="gruppo-totale">${formattaEuro(sommaGruppo)}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Attività realizzata</th>
              <th>Importo</th>
              <th>Stato</th>
              <th class="no-print">Note</th>
              <th class="no-print">Azioni</th>
            </tr>
          </thead>
          <tbody></tbody>
          <tfoot>
            <tr class="riga-totale">
              <td colspan="2">Totale ${escapeHtml(gruppo.nome)}</td>
              <td>${formattaEuro(sommaGruppo)}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const tbody = sezione.querySelector("tbody");
    for (const riga of gruppo.righe) {
      const tr = document.createElement("tr");
      tr.className = riga.pagato ? "riga-pagata" : "riga-da-pagare";
      tr.innerHTML = `
        <td>${formattaDataIT(riga.data)}</td>
        <td>${escapeHtml(riga.descrizione)}</td>
        <td>${formattaEuro(riga.importo)}</td>
        <td>
          <button class="badge ${riga.pagato ? "badge-pagato" : "badge-da-pagare"}" data-toggle="${riga.id}" title="Clicca per cambiare stato">
            ${riga.pagato ? "✅ Pagato" : "⏳ Da pagare"}
          </button>
        </td>
        <td class="no-print note-cell">${escapeHtml(riga.note || "")}</td>
        <td class="no-print">
          <div class="azioni">
            <button class="icon-btn" data-modifica="${riga.id}" title="Modifica">✏️</button>
            <button class="icon-btn" data-elimina="${riga.id}" title="Elimina">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    contenitoreGruppi.appendChild(sezione);
  }
}

async function aggiornaTutto() {
  await Promise.all([caricaTabella(), caricaStats()]);
}

// ---------- Click su tabella (delegato, contenitore dinamico) ----------
contenitoreGruppi.addEventListener("click", async (e) => {
  const toggleId = e.target.closest("[data-toggle]")?.dataset.toggle;
  const modificaId = e.target.closest("[data-modifica]")?.dataset.modifica;
  const eliminaId = e.target.closest("[data-elimina]")?.dataset.elimina;

  if (toggleId) {
    await fetch(`${API}/${toggleId}/pagato`, { method: "PATCH" });
    mostraToast("Stato pagamento aggiornato");
    aggiornaTutto();
  }
  if (modificaId) apriModaleModifica(modificaId);
  if (eliminaId) apriConfermaElimina(eliminaId);
});

// ---------- Filtri ----------
document.getElementById("filtroStato").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-btn");
  if (!btn) return;
  document
    .querySelectorAll(".filtro-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  filtroStato = btn.dataset.filtro;
  caricaTabella();
});

document.getElementById("cercaInput").addEventListener("input", (e) => {
  testoCerca = e.target.value;
  caricaTabella();
});

// ---------- Modale Nuova/Modifica attività ----------
const modalOverlay = document.getElementById("modalOverlay");
const form = document.getElementById("formAttivita");
const fImporto = document.getElementById("fImporto");

document
  .getElementById("btnNuovo")
  .addEventListener("click", () => apriModaleNuovo());
document.getElementById("btnAnnulla").addEventListener("click", chiudiModale);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) chiudiModale();
});

collegaImportoLive(fImporto);

document
  .getElementById("btnNuovoClienteInline")
  .addEventListener("click", () => {
    apriClienti(true);
  });

function apriModaleNuovo() {
  document.getElementById("modalTitolo").textContent = "Nuova attività";
  form.reset();
  document.getElementById("fId").value = "";
  document.getElementById("fData").value = new Date()
    .toISOString()
    .slice(0, 10);
  if (filtroClienteId !== "tutti") {
    comboFormCliente.setValore(filtroClienteId);
  } else {
    comboFormCliente.setValore("");
  }
  modalOverlay.classList.remove("hidden");
  document.getElementById("fDescrizione").focus();
}

function apriModaleModifica(id) {
  const riga = datiCorrenti.find((r) => String(r.id) === String(id));
  if (!riga) return;
  document.getElementById("modalTitolo").textContent = "Modifica attività";
  document.getElementById("fId").value = riga.id;
  comboFormCliente.setValore(riga.cliente_id || "");
  document.getElementById("fData").value = riga.data;
  document.getElementById("fDescrizione").value = riga.descrizione;
  fImporto.value = formattaImportoInput(riga.importo);
  document.getElementById("fNote").value = riga.note || "";
  document.getElementById("fPagato").checked = riga.pagato;
  modalOverlay.classList.remove("hidden");
}

function chiudiModale() {
  modalOverlay.classList.add("hidden");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const importoNumerico = parseImportoIT(fImporto.value);
  if (isNaN(importoNumerico) || importoNumerico < 0) {
    mostraToast("⚠️ Importo non valido. Es: 1.000,00 oppure 50,00");
    fImporto.focus();
    return;
  }

  const clienteId = comboFormCliente.getValore();
  if (!clienteId) {
    mostraToast("⚠️ Seleziona un cliente");
    return;
  }

  const id = document.getElementById("fId").value;
  const payload = {
    cliente_id: Number(clienteId),
    data: document.getElementById("fData").value,
    descrizione: document.getElementById("fDescrizione").value.trim(),
    importo: importoNumerico,
    note: document.getElementById("fNote").value.trim(),
    pagato: document.getElementById("fPagato").checked,
  };

  if (id) {
    await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    mostraToast("Attività aggiornata");
  } else {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    mostraToast("Attività aggiunta");
  }

  chiudiModale();
  aggiornaTutto();
});

// ---------- Eliminazione (definitiva) ----------
const confirmOverlay = document.getElementById("confirmOverlay");
let idDaEliminare = null;

function apriConfermaElimina(id) {
  idDaEliminare = id;
  confirmOverlay.classList.remove("hidden");
}
document.getElementById("btnAnnullaElimina").addEventListener("click", () => {
  idDaEliminare = null;
  confirmOverlay.classList.add("hidden");
});
document
  .getElementById("btnConfermaElimina")
  .addEventListener("click", async () => {
    if (idDaEliminare) {
      await fetch(`${API}/${idDaEliminare}`, { method: "DELETE" });
      mostraToast("Attività eliminata");
    }
    confirmOverlay.classList.add("hidden");
    idDaEliminare = null;
    aggiornaTutto();
  });
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.add("hidden");
    idDaEliminare = null;
  }
});

// ---------- Gestione Clienti ----------
const clientiOverlay = document.getElementById("clientiOverlay");
const clientiLista = document.getElementById("clientiLista");
const clientiVuoto = document.getElementById("clientiVuoto");
const formClienteNuovo = document.getElementById("formClienteNuovo");
const cercaClienteGestione = document.getElementById("cercaClienteGestione");

document
  .getElementById("btnClienti")
  .addEventListener("click", () => apriClienti(false));
document
  .getElementById("btnChiudiClienti")
  .addEventListener("click", () => clientiOverlay.classList.add("hidden"));
clientiOverlay.addEventListener("click", (e) => {
  if (e.target === clientiOverlay) clientiOverlay.classList.add("hidden");
});

async function apriClienti(focusNuovo) {
  clientiOverlay.classList.remove("hidden");
  cercaClienteGestione.value = "";
  await renderClientiLista();
  if (focusNuovo) document.getElementById("fNuovoClienteNome").focus();
}

async function renderClientiLista() {
  await caricaClienti();
  const q = cercaClienteGestione.value.trim().toLowerCase();
  const filtrati = clientiCorrenti.filter((c) =>
    c.nome.toLowerCase().includes(q),
  );

  clientiLista.innerHTML = "";
  if (filtrati.length === 0) {
    clientiVuoto.classList.remove("hidden");
    clientiVuoto.textContent =
      clientiCorrenti.length === 0
        ? "Nessun cliente creato. Aggiungine uno qui sopra."
        : "Nessun cliente trovato con questo nome.";
    return;
  }
  clientiVuoto.classList.add("hidden");

  for (const c of filtrati) {
    const div = document.createElement("div");
    div.className = "cliente-item";
    const haAttivita = c.num_attivita > 0;
    div.innerHTML = `
      <input type="text" class="cliente-nome-input" data-id="${c.id}" value="${escapeHtml(c.nome)}">
      <span class="cliente-num">${c.num_attivita} attività</span>
      <button class="icon-btn ${haAttivita ? "icon-btn-disabled" : ""}" data-elimina-cliente="${c.id}" title="${haAttivita ? "Non eliminabile: ha attività collegate" : "Elimina cliente"}">🗑️</button>
    `;
    clientiLista.appendChild(div);
  }
}

cercaClienteGestione.addEventListener("input", () => renderClientiLista());

formClienteNuovo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("fNuovoClienteNome").value.trim();
  if (!nome) return;

  const res = await fetch(CLIENTI_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (res.ok) {
    mostraToast("Cliente creato");
    formClienteNuovo.reset();
    await renderClientiLista();
  } else {
    const err = await res.json();
    mostraToast("⚠️ " + (err.errore || "Errore creazione cliente"));
  }
});

clientiLista.addEventListener("change", async (e) => {
  const nomeInput = e.target.closest(".cliente-nome-input");
  if (nomeInput) {
    await fetch(`${CLIENTI_API}/${nomeInput.dataset.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeInput.value.trim() }),
    });
    mostraToast("Cliente aggiornato");
    await caricaClienti();
    caricaTabella();
  }
});

clientiLista.addEventListener("click", async (e) => {
  const eliminaId = e.target.closest("[data-elimina-cliente]")?.dataset
    .eliminaCliente;
  if (eliminaId) {
    if (confirm("Eliminare questo cliente?")) {
      const res = await fetch(`${CLIENTI_API}/${eliminaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mostraToast("Cliente eliminato");
        await renderClientiLista();
        aggiornaTutto();
      } else {
        const err = await res.json();
        mostraToast("⚠️ " + (err.errore || "Impossibile eliminare il cliente"));
      }
    }
  }
});

// ---------- Stampa ----------
document.getElementById("btnStampa").addEventListener("click", () => {
  document.getElementById("printDate").textContent =
    "Generato il " +
    new Date().toLocaleDateString("it-IT") +
    " alle " +
    new Date().toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const etichette = {
    tutti: "Tutti gli stati",
    pagati: "Solo pagati",
    da_pagare: "Solo da pagare",
  };
  let testoFiltro = `Stato: ${etichette[filtroStato]}`;
  if (filtroClienteId !== "tutti") {
    const c = clientiCorrenti.find(
      (c) => String(c.id) === String(filtroClienteId),
    );
    testoFiltro += ` · Cliente: ${c ? c.nome : ""}`;
  } else {
    testoFiltro += " · Tutti i clienti";
  }
  document.getElementById("printFiltro").textContent = testoFiltro;
  window.print();
});

// ---------- Avvio ----------
(async function init() {
  comboFiltroCliente = creaComboCliente(
    "comboFiltroCliente",
    "comboFiltroClienteInput",
    "comboFiltroClienteValue",
    "comboFiltroClienteList",
    {
      opzioneTutti: true,
      onChange(id) {
        filtroClienteId = id;
        aggiornaTutto();
      },
    },
  );
  comboFormCliente = creaComboCliente(
    "comboFormCliente",
    "comboFormClienteInput",
    "fCliente",
    "comboFormClienteList",
    {
      opzioneTutti: false,
    },
  );

  await caricaClienti();
  await aggiornaTutto();
})();