// Componente: combobox cercabile per selezionare un cliente
import { state } from "../state/store.js";

export function creaComboCliente(
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
    const arr = state.clientiCorrenti.map((c) => ({
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
