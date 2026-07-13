// Feature: stampa del report con intestazione dinamica
import { state } from "../state/store.js";

const ETICHETTE_FILTRO = {
  tutti: "Tutti gli stati",
  pagati: "Solo pagati",
  da_pagare: "Solo da pagare",
};

export function initStampa() {
  document.getElementById("btnStampa").addEventListener("click", () => {
    document.getElementById("printDate").textContent =
      "Generato il " +
      new Date().toLocaleDateString("it-IT") +
      " alle " +
      new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

    let testoFiltro = `Stato: ${ETICHETTE_FILTRO[state.filtroStato]}`;
    if (state.filtroClienteIds.length > 0) {
      const nomi = state.filtroClienteIds
        .map((id) =>
          state.clientiCorrenti.find((c) => String(c.id) === String(id)),
        )
        .filter(Boolean)
        .map((c) => c.nome);
      testoFiltro += ` · Cliente: ${nomi.join(", ")}`;
    } else {
      testoFiltro += " · Tutti i clienti";
    }
    document.getElementById("printFiltro").textContent = testoFiltro;
    window.print();
  });
}
