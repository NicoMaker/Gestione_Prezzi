// Feature: filtri di stato e casella di ricerca
import { state, caricaTabella } from "../state/store.js";

export function initFiltri() {
  document.getElementById("filtroStato").addEventListener("click", (e) => {
    const btn = e.target.closest(".filtro-btn");
    if (!btn) return;
    document
      .querySelectorAll(".filtro-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.filtroStato = btn.dataset.filtro;
    caricaTabella();
  });

  const cercaInput = document.getElementById("cercaInput");
  const cercaClear = document.getElementById("cercaClear");

  cercaInput.addEventListener("input", (e) => {
    state.testoCerca = e.target.value;
    cercaClear.classList.toggle("hidden", state.testoCerca.length === 0);
    caricaTabella();
  });

  cercaClear.addEventListener("click", () => {
    state.testoCerca = "";
    cercaInput.value = "";
    cercaClear.classList.add("hidden");
    cercaInput.focus();
    caricaTabella();
  });
}
