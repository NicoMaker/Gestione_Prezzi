// Utility numeri / valute / date (formato italiano: punto migliaia, virgola decimali)

export function parseImportoIT(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim();
  if (s === "") return NaN;
  s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

export function formattaImportoInput(numero) {
  return Number(numero).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formattaEuro(numero) {
  return (
    "€ " +
    Number(numero).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Formatta una percentuale con 2 decimali e virgola (es. 62,50%)
export function formattaPercentuale(valore) {
  return valore.toFixed(2).replace(".", ",") + "%";
}

export function formattaDataIT(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
