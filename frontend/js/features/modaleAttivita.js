// Feature: modale Nuova/Modifica attività
import { attivitaApi } from "../api/apiClient.js";
import { state, aggiornaTutto } from "../state/store.js";
import { parseImportoIT, formattaImportoInput } from "../utils/format.js";
import { mostraToast } from "../utils/toast.js";
import { collegaImportoLive } from "../components/importoInput.js";

const modalOverlay = document.getElementById("modalOverlay");
const form = document.getElementById("formAttivita");
const fImporto = document.getElementById("fImporto");

let comboFormCliente = null;
let apriGestioneClienti = () => {};

export function initModaleAttivita({ combo, apriClienti }) {
  comboFormCliente = combo;
  apriGestioneClienti = apriClienti;

  document
    .getElementById("btnNuovo")
    .addEventListener("click", () => apriModaleNuovo());
  document
    .getElementById("btnAnnulla")
    .addEventListener("click", chiudiModale);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) chiudiModale();
  });

  collegaImportoLive(fImporto);

  document
    .getElementById("btnNuovoClienteInline")
    .addEventListener("click", () => apriGestioneClienti(true));

  form.addEventListener("submit", onSubmit);
}

export function apriModaleNuovo() {
  document.getElementById("modalTitolo").textContent = "Nuova attività";
  form.reset();
  document.getElementById("fId").value = "";
  document.getElementById("fData").value = new Date()
    .toISOString()
    .slice(0, 10);
  if (state.filtroClienteIds.length === 1) {
    comboFormCliente.setValore(state.filtroClienteIds[0]);
  } else {
    comboFormCliente.setValore("");
  }
  modalOverlay.classList.remove("hidden");
  document.getElementById("fDescrizione").focus();
}

export function apriModaleModifica(id) {
  const riga = state.datiCorrenti.find((r) => String(r.id) === String(id));
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

async function onSubmit(e) {
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
    await attivitaApi.aggiorna(id, payload);
    mostraToast("Attività aggiornata");
  } else {
    await attivitaApi.crea(payload);
    mostraToast("Attività aggiunta");
  }

  chiudiModale();
  aggiornaTutto();
}
