// Feature: dialog di conferma eliminazione attività
import { attivitaApi } from "../api/apiClient.js";
import { aggiornaTutto } from "../state/store.js";
import { mostraToast } from "../utils/toast.js";

const confirmOverlay = document.getElementById("confirmOverlay");
let idDaEliminare = null;

export function initConfermaElimina() {
  document.getElementById("btnAnnullaElimina").addEventListener("click", () => {
    idDaEliminare = null;
    confirmOverlay.classList.add("hidden");
  });

  document
    .getElementById("btnConfermaElimina")
    .addEventListener("click", async () => {
      if (idDaEliminare) {
        await attivitaApi.elimina(idDaEliminare);
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
}

export function apriConfermaElimina(id) {
  idDaEliminare = id;
  confirmOverlay.classList.remove("hidden");
}
