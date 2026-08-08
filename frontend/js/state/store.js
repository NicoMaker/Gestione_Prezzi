// Stato applicativo condiviso tra i moduli.
// Unica fonte di verità per filtri, dati correnti e lista clienti.

export const state = {
  filtroStato: "tutti",
  filtroClienteIds: [], // array vuoto = tutti i clienti
  testoCerca: "",
  datiCorrenti: [],
  clientiCorrenti: [],
};

// Riferimenti alle azioni di ricarica, registrati dal main per evitare
// dipendenze circolari tra le feature.
const actions = {};

export function registraAzioni({
  aggiornaTutto,
  caricaTabella,
  caricaClienti,
}) {
  actions.aggiornaTutto = aggiornaTutto;
  actions.caricaTabella = caricaTabella;
  actions.caricaClienti = caricaClienti;
}

export function aggiornaTutto() {
  return actions.aggiornaTutto?.();
}

export function caricaTabella() {
  return actions.caricaTabella?.();
}

export function caricaClienti() {
  return actions.caricaClienti?.();
}
