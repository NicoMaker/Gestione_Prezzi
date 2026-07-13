// Entry point: inizializza componenti e feature, collega lo stato condiviso
import { clientiApi } from "./api/apiClient.js";
import { state, registraAzioni } from "./state/store.js";
import { creaComboCliente } from "./components/comboCliente.js";
import { creaMultiSelectCliente } from "./components/multiSelectCliente.js";
import { caricaStats } from "./features/stats.js";
import { caricaTabella, registraAzioniRiga } from "./features/tabella.js";
import { initFiltri } from "./features/filtri.js";
import {
  initModaleAttivita,
  apriModaleModifica,
} from "./features/modaleAttivita.js";
import {
  initConfermaElimina,
  apriConfermaElimina,
} from "./features/confermaElimina.js";
import {
  initGestioneClienti,
  apriClienti,
} from "./features/gestioneClienti.js";
import { initStampa } from "./features/stampa.js";

let multiselectFiltroCliente = null;
let comboFormCliente = null;

async function caricaClienti() {
  state.clientiCorrenti = await clientiApi.lista();
  if (multiselectFiltroCliente) multiselectFiltroCliente.refresh();
  if (comboFormCliente) comboFormCliente.refresh();
}

async function aggiornaTutto() {
  await Promise.all([caricaTabella(), caricaStats()]);
}

(async function init() {
  // Azioni condivise disponibili a tutte le feature tramite lo store
  registraAzioni({ aggiornaTutto, caricaTabella, caricaClienti });

  // Componenti
  multiselectFiltroCliente = creaMultiSelectCliente({
    containerId: "multiselectFiltroCliente",
    toggleId: "multiselectFiltroClienteToggle",
    labelId: "multiselectFiltroClienteLabel",
    listId: "multiselectFiltroClienteList",
    searchId: "multiselectFiltroClienteSearch",
    opzioniContainerId: "multiselectFiltroClienteOpzioni",
    btnTuttiId: "multiselectFiltroClienteTutti",
    btnNessunoId: "multiselectFiltroClienteNessuno",
    onChange(ids) {
      state.filtroClienteIds = ids;
      aggiornaTutto();
    },
  });

  comboFormCliente = creaComboCliente(
    "comboFormCliente",
    "comboFormClienteInput",
    "fCliente",
    "comboFormClienteList",
    { opzioneTutti: false },
  );

  // Feature
  initFiltri();
  initModaleAttivita({ combo: comboFormCliente, apriClienti });
  initConfermaElimina();
  initGestioneClienti();
  initStampa();

  // Le azioni delle righe della tabella (modifica/elimina) sono gestite
  // dalle rispettive feature: la tabella le riceve come callback
  registraAzioniRiga({
    apriModifica: apriModaleModifica,
    apriElimina: apriConfermaElimina,
  });

  // Avvio
  await caricaClienti();
  await aggiornaTutto();
})();
