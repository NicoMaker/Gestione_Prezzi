// Componente: formattazione live dell'importo mentre si scrive (formato IT)
import { parseImportoIT, formattaImportoInput } from "../utils/format.js";

function formattaImportoLive(raw) {
  let s = String(raw).replace(/[^0-9,]/g, "");
  const primaVirgola = s.indexOf(",");
  if (primaVirgola !== -1) {
    s =
      s.slice(0, primaVirgola + 1) +
      s.slice(primaVirgola + 1).replace(/,/g, "");
  }
  let [intPart, decPart] = s.split(",");
  intPart = intPart || "";
  intPart = intPart.replace(/^0+(?=\d)/, "");
  const intFormattata = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decPart !== undefined) {
    decPart = decPart.slice(0, 2);
    return intFormattata + "," + decPart;
  }
  return intFormattata;
}

export function collegaImportoLive(input) {
  input.addEventListener("input", () => {
    const valorePrecedente = input.value;
    const cursorDaFine = valorePrecedente.length - input.selectionStart;
    const nuovoValore = formattaImportoLive(valorePrecedente);
    input.value = nuovoValore;
    const nuovaPosizione = Math.max(0, nuovoValore.length - cursorDaFine);
    input.setSelectionRange(nuovaPosizione, nuovaPosizione);
  });
  input.addEventListener("blur", () => {
    const valore = parseImportoIT(input.value);
    if (!isNaN(valore)) {
      input.value = formattaImportoInput(valore);
    }
  });
}
