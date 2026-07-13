// Feature: card riepilogo statistiche in alto
import { statsApi } from "../api/apiClient.js";
import { state } from "../state/store.js";
import { formattaEuro, formattaPercentuale } from "../utils/format.js";

export async function caricaStats() {
  const stats = await statsApi.carica(state.filtroClienteIds);

  document.getElementById("statTotale").textContent = formattaEuro(stats.totale);
  document.getElementById("statTotaleNum").textContent =
    `${stats.numero_totale} voci`;
  document.getElementById("statPagato").textContent = formattaEuro(stats.pagato);
  document.getElementById("statPagatoNum").textContent =
    `${stats.numero_pagati} voci`;
  document.getElementById("statDaPagare").textContent = formattaEuro(
    stats.da_pagare,
  );
  document.getElementById("statDaPagareNum").textContent =
    `${stats.numero_da_pagare} voci`;

  // Percentuali con 2 decimali e virgola
  if (stats.totale > 0) {
    const percPagato = (stats.pagato / stats.totale) * 100;
    const percDaPagare = (stats.da_pagare / stats.totale) * 100;
    document.getElementById("statPagatoPerc").textContent =
      `(${formattaPercentuale(percPagato)})`;
    document.getElementById("statDaPagarePerc").textContent =
      `(${formattaPercentuale(percDaPagare)})`;
  } else {
    document.getElementById("statPagatoPerc").textContent = "(0,00%)";
    document.getElementById("statDaPagarePerc").textContent = "(0,00%)";
  }
}
