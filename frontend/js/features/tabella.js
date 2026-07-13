// Feature: caricamento e rendering della tabella raggruppata per cliente
import { attivitaApi } from "../api/apiClient.js";
import { state, aggiornaTutto } from "../state/store.js";
import {
  formattaEuro,
  formattaPercentuale,
  formattaDataIT,
  escapeHtml,
} from "../utils/format.js";
import { mostraToast } from "../utils/toast.js";

const contenitoreGruppi = document.getElementById("contenitoreGruppi");
const vuotoMsg = document.getElementById("vuoto");

// Callback registrate dalle feature modale/eliminazione
let onModifica = () => {};
let onElimina = () => {};

export function registraAzioniRiga({ apriModifica, apriElimina }) {
  onModifica = apriModifica;
  onElimina = apriElimina;
}

export async function caricaTabella() {
  let dati = await attivitaApi.lista({
    filtro: state.filtroStato,
    clienteIds: state.filtroClienteIds,
  });

  if (state.testoCerca.trim()) {
    const q = state.testoCerca.trim().toLowerCase();
    dati = dati.filter(
      (r) =>
        r.descrizione.toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q),
    );
  }

  state.datiCorrenti = dati;
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

  if (somma > 0) {
    document.getElementById("footPagatoPerc").textContent =
      `(${formattaPercentuale((sommaPagato / somma) * 100)})`;
    document.getElementById("footDaPagarePerc").textContent =
      `(${formattaPercentuale((sommaDaPagare / somma) * 100)})`;
  } else {
    document.getElementById("footPagatoPerc").textContent = "(0,00%)";
    document.getElementById("footDaPagarePerc").textContent = "(0,00%)";
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

  for (const [, gruppo] of raggruppaPerCliente(dati)) {
    contenitoreGruppi.appendChild(creaSezioneGruppo(gruppo));
  }
}

function creaSezioneGruppo(gruppo) {
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

  let percPagato = "0,00%",
    percDaPagare = "0,00%";
  if (sommaGruppo > 0) {
    percPagato = formattaPercentuale((sommaPagatoGruppo / sommaGruppo) * 100);
    percDaPagare = formattaPercentuale(
      (sommaDaPagareGruppo / sommaGruppo) * 100,
    );
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
    tbody.appendChild(creaRiga(riga));
  }
  return sezione;
}

function creaRiga(riga) {
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
  return tr;
}

// Delegazione eventi sulle righe (toggle pagato, modifica, elimina)
contenitoreGruppi.addEventListener("click", async (e) => {
  const toggleId = e.target.closest("[data-toggle]")?.dataset.toggle;
  const modificaId = e.target.closest("[data-modifica]")?.dataset.modifica;
  const eliminaId = e.target.closest("[data-elimina]")?.dataset.elimina;

  if (toggleId) {
    await attivitaApi.togglePagato(toggleId);
    mostraToast("Stato pagamento aggiornato");
    aggiornaTutto();
  }
  if (modificaId) onModifica(modificaId);
  if (eliminaId) onElimina(eliminaId);
});
