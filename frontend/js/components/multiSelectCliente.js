// Componente: multi-selezione clienti con ricerca (usato nel filtro)
import { state } from "../state/store.js";
import { escapeHtml } from "../utils/format.js";

export function creaMultiSelectCliente({
  containerId,
  toggleId,
  labelId,
  listId,
  searchId,
  opzioniContainerId,
  btnTuttiId,
  btnNessunoId,
  onChange,
}) {
  const container = document.getElementById(containerId);
  const toggle = document.getElementById(toggleId);
  const label = document.getElementById(labelId);
  const lista = document.getElementById(listId);
  const search = document.getElementById(searchId);
  const opzioniContainer = document.getElementById(opzioniContainerId);
  const btnTutti = document.getElementById(btnTuttiId);
  const btnNessuno = document.getElementById(btnNessunoId);

  let selezionati = []; // array di id (stringa), vuoto = tutti

  function aggiornaEtichetta() {
    if (selezionati.length === 0) {
      label.textContent = "👥 Tutti i clienti";
    } else if (selezionati.length === 1) {
      const c = state.clientiCorrenti.find(
        (c) => String(c.id) === String(selezionati[0]),
      );
      label.textContent = "👤 " + (c ? c.nome : "1 cliente");
    } else {
      label.textContent = `👥 ${selezionati.length} clienti selezionati`;
    }
  }

  function clientiFiltrati(filtro) {
    const q = (filtro || "").trim().toLowerCase();
    return state.clientiCorrenti.filter((c) =>
      c.nome.toLowerCase().includes(q),
    );
  }

  function renderOpzioni(filtro) {
    const filtrati = clientiFiltrati(filtro);
    opzioniContainer.innerHTML = "";
    if (filtrati.length === 0) {
      opzioniContainer.innerHTML =
        '<div class="multiselect-item-vuoto">Nessun cliente trovato</div>';
      return;
    }
    for (const c of filtrati) {
      const id = String(c.id);
      const item = document.createElement("label");
      item.className = "multiselect-item";
      const checked = selezionati.includes(id) ? "checked" : "";
      item.innerHTML = `<input type="checkbox" value="${id}" ${checked}> <span>${escapeHtml(c.nome)}</span>`;
      const checkbox = item.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (!selezionati.includes(id)) selezionati.push(id);
        } else {
          selezionati = selezionati.filter((x) => x !== id);
        }
        aggiornaEtichetta();
        if (onChange) onChange([...selezionati]);
      });
      opzioniContainer.appendChild(item);
    }
  }

  toggle.addEventListener("click", () => {
    const apri = lista.classList.contains("hidden");
    if (apri) {
      search.value = "";
      renderOpzioni("");
      lista.classList.remove("hidden");
      search.focus();
    } else {
      lista.classList.add("hidden");
    }
  });

  search.addEventListener("input", () => renderOpzioni(search.value));

  btnTutti.addEventListener("click", () => {
    const idsVisibili = clientiFiltrati(search.value).map((c) => String(c.id));
    selezionati = [...new Set([...selezionati, ...idsVisibili])];
    renderOpzioni(search.value);
    aggiornaEtichetta();
    if (onChange) onChange([...selezionati]);
  });

  btnNessuno.addEventListener("click", () => {
    const idsVisibili = new Set(
      clientiFiltrati(search.value).map((c) => String(c.id)),
    );
    selezionati = selezionati.filter((id) => !idsVisibili.has(id));
    renderOpzioni(search.value);
    aggiornaEtichetta();
    if (onChange) onChange([...selezionati]);
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) lista.classList.add("hidden");
  });

  return {
    getSelezionati() {
      return [...selezionati];
    },
    setSelezionati(arr) {
      selezionati = (arr || []).map(String);
      aggiornaEtichetta();
    },
    refresh() {
      // rimuove dalla selezione eventuali clienti non più esistenti
      const idsValidi = new Set(state.clientiCorrenti.map((c) => String(c.id)));
      selezionati = selezionati.filter((id) => idsValidi.has(id));
      aggiornaEtichetta();
    },
  };
}
