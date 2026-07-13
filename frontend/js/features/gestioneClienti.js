// Feature: pannello di gestione clienti (crea / rinomina / elimina)
import { clientiApi } from "../api/apiClient.js";
import {
  state,
  aggiornaTutto,
  caricaTabella,
  caricaClienti,
} from "../state/store.js";
import { escapeHtml } from "../utils/format.js";
import { mostraToast } from "../utils/toast.js";

const clientiOverlay = document.getElementById("clientiOverlay");
const clientiLista = document.getElementById("clientiLista");
const clientiVuoto = document.getElementById("clientiVuoto");
const formClienteNuovo = document.getElementById("formClienteNuovo");
const cercaClienteGestione = document.getElementById("cercaClienteGestione");

export function initGestioneClienti() {
  document
    .getElementById("btnClienti")
    .addEventListener("click", () => apriClienti(false));
  document
    .getElementById("btnChiudiClienti")
    .addEventListener("click", () => clientiOverlay.classList.add("hidden"));
  clientiOverlay.addEventListener("click", (e) => {
    if (e.target === clientiOverlay) clientiOverlay.classList.add("hidden");
  });

  cercaClienteGestione.addEventListener("input", () => renderClientiLista());
  formClienteNuovo.addEventListener("submit", onNuovoCliente);
  clientiLista.addEventListener("change", onRinominaCliente);
  clientiLista.addEventListener("click", onEliminaCliente);
}

export async function apriClienti(focusNuovo) {
  clientiOverlay.classList.remove("hidden");
  cercaClienteGestione.value = "";
  await renderClientiLista();
  if (focusNuovo) document.getElementById("fNuovoClienteNome").focus();
}

async function renderClientiLista() {
  await caricaClienti();
  const q = cercaClienteGestione.value.trim().toLowerCase();
  const filtrati = state.clientiCorrenti.filter((c) =>
    c.nome.toLowerCase().includes(q),
  );

  clientiLista.innerHTML = "";
  if (filtrati.length === 0) {
    clientiVuoto.classList.remove("hidden");
    clientiVuoto.textContent =
      state.clientiCorrenti.length === 0
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

async function onNuovoCliente(e) {
  e.preventDefault();
  const nome = document.getElementById("fNuovoClienteNome").value.trim();
  if (!nome) return;

  const res = await clientiApi.crea(nome);
  if (res.ok) {
    mostraToast("Cliente creato");
    formClienteNuovo.reset();
    await renderClientiLista();
  } else {
    const err = await res.json();
    mostraToast("⚠️ " + (err.errore || "Errore creazione cliente"));
  }
}

async function onRinominaCliente(e) {
  const nomeInput = e.target.closest(".cliente-nome-input");
  if (!nomeInput) return;
  await clientiApi.aggiorna(nomeInput.dataset.id, nomeInput.value.trim());
  mostraToast("Cliente aggiornato");
  await caricaClienti();
  caricaTabella();
}

async function onEliminaCliente(e) {
  const eliminaId = e.target.closest("[data-elimina-cliente]")?.dataset
    .eliminaCliente;
  if (!eliminaId) return;
  if (!confirm("Eliminare questo cliente?")) return;

  const res = await clientiApi.elimina(eliminaId);
  if (res.ok) {
    mostraToast("Cliente eliminato");
    await renderClientiLista();
    aggiornaTutto();
  } else {
    const err = await res.json();
    mostraToast("⚠️ " + (err.errore || "Impossibile eliminare il cliente"));
  }
}
