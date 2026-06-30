const API = '/api/attivita';
const STATS_API = '/api/stats';
const CESTINO_API = '/api/cestino';

let filtroCorrente = 'tutti';
let testoCerca = '';
let datiCorrenti = [];

const tbody = document.getElementById('tbody');
const vuotoMsg = document.getElementById('vuoto');

// ---------- Utility numeri / valute (formato italiano) ----------

// Converte una stringa scritta dall'utente in formato italiano (es. "1.000,00" o "1000" o "50,5")
// in un numero JS valido (es. 1000.00 / 1000 / 50.5)
function parseImportoIT(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim();
  if (s === '') return NaN;

  // Se contiene sia punto che virgola: il punto è separatore delle migliaia, la virgola dei decimali
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // Solo virgola -> è il separatore decimale
    s = s.replace(',', '.');
  }
  // Se contiene solo punti, lo lasciamo come separatore decimale standard (es. "50.5")
  return parseFloat(s);
}

// Formatta un numero per la visualizzazione nei campi del form, es. 1000 -> "1.000,00"
function formattaImportoInput(numero) {
  return Number(numero).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formattaEuro(numero) {
  return '€ ' + Number(numero).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formattaDataIT(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function mostraToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

// ---------- Caricamento dati ----------
async function caricaStats() {
  const res = await fetch(STATS_API);
  const stats = await res.json();
  document.getElementById('statTotale').textContent = formattaEuro(stats.totale);
  document.getElementById('statTotaleNum').textContent = `${stats.numero_totale} voci`;
  document.getElementById('statPagato').textContent = formattaEuro(stats.pagato);
  document.getElementById('statPagatoNum').textContent = `${stats.numero_pagati} voci`;
  document.getElementById('statDaPagare').textContent = formattaEuro(stats.da_pagare);
  document.getElementById('statDaPagareNum').textContent = `${stats.numero_da_pagare} voci`;

  const badge = document.getElementById('cestinoCount');
  if (stats.numero_cestino > 0) {
    badge.textContent = stats.numero_cestino;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function caricaTabella() {
  const res = await fetch(`${API}?filtro=${filtroCorrente}`);
  let dati = await res.json();

  if (testoCerca.trim()) {
    const q = testoCerca.trim().toLowerCase();
    dati = dati.filter(r => r.descrizione.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q));
  }

  datiCorrenti = dati;
  renderTabella(dati);
  aggiornaTotaleVisualizzato(dati);
}

// Il totale a fondo tabella riflette SEMPRE i soli elementi attualmente visibili
// (rispetta filtro Tutti/Pagati/Da pagare e la ricerca), niente piu' "1500 fisso".
function aggiornaTotaleVisualizzato(dati) {
  const somma = dati.reduce((acc, r) => acc + Number(r.importo), 0);
  document.getElementById('footTotale').textContent = formattaEuro(somma);

  const etichette = { tutti: 'Totale', pagati: 'Totale pagato (filtrato)', da_pagare: 'Totale da pagare (filtrato)' };
  document.querySelector('.riga-totale td:first-child').textContent = etichette[filtroCorrente] || 'Totale';
}

function renderTabella(dati) {
  tbody.innerHTML = '';

  if (dati.length === 0) {
    vuotoMsg.classList.remove('hidden');
    return;
  }
  vuotoMsg.classList.add('hidden');

  for (const riga of dati) {
    const tr = document.createElement('tr');
    tr.className = riga.pagato ? 'riga-pagata' : 'riga-da-pagare';

    tr.innerHTML = `
      <td>${formattaDataIT(riga.data)}</td>
      <td>${escapeHtml(riga.descrizione)}</td>
      <td>${formattaEuro(riga.importo)}</td>
      <td>
        <button class="badge ${riga.pagato ? 'badge-pagato' : 'badge-da-pagare'}" data-toggle="${riga.id}" title="Clicca per cambiare stato">
          ${riga.pagato ? '✅ Pagato' : '⏳ Da pagare'}
        </button>
      </td>
      <td class="no-print note-cell">${escapeHtml(riga.note || '')}</td>
      <td class="no-print">
        <div class="azioni">
          <button class="icon-btn" data-modifica="${riga.id}" title="Modifica">✏️</button>
          <button class="icon-btn" data-elimina="${riga.id}" title="Sposta nel cestino">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function aggiornaTutto() {
  await Promise.all([caricaTabella(), caricaStats()]);
}

// ---------- Toggle pagato (automatico) ----------
tbody.addEventListener('click', async (e) => {
  const toggleId = e.target.closest('[data-toggle]')?.dataset.toggle;
  const modificaId = e.target.closest('[data-modifica]')?.dataset.modifica;
  const eliminaId = e.target.closest('[data-elimina]')?.dataset.elimina;

  if (toggleId) {
    await fetch(`${API}/${toggleId}/pagato`, { method: 'PATCH' });
    mostraToast('Stato pagamento aggiornato');
    aggiornaTutto();
  }
  if (modificaId) apriModaleModifica(modificaId);
  if (eliminaId) apriConfermaElimina(eliminaId);
});

// ---------- Filtri ----------
document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroCorrente = btn.dataset.filtro;
    caricaTabella();
  });
});

document.getElementById('cercaInput').addEventListener('input', (e) => {
  testoCerca = e.target.value;
  caricaTabella();
});

// ---------- Modale Nuova/Modifica ----------
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('formAttivita');
const fImporto = document.getElementById('fImporto');

document.getElementById('btnNuovo').addEventListener('click', () => apriModaleNuovo());
document.getElementById('btnAnnulla').addEventListener('click', chiudiModale);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) chiudiModale(); });

// Mentre l'utente scrive l'importo lasciamo libero (accetta sia virgola che punto),
// quando esce dal campo lo riformattiamo in stile italiano leggibile (1.000,00)
fImporto.addEventListener('blur', () => {
  const valore = parseImportoIT(fImporto.value);
  if (!isNaN(valore)) {
    fImporto.value = formattaImportoInput(valore);
  }
});

function apriModaleNuovo() {
  document.getElementById('modalTitolo').textContent = 'Nuova attività';
  form.reset();
  document.getElementById('fId').value = '';
  document.getElementById('fData').value = new Date().toISOString().slice(0, 10);
  modalOverlay.classList.remove('hidden');
  document.getElementById('fDescrizione').focus();
}

function apriModaleModifica(id) {
  const riga = datiCorrenti.find(r => String(r.id) === String(id));
  if (!riga) return;
  document.getElementById('modalTitolo').textContent = 'Modifica attività';
  document.getElementById('fId').value = riga.id;
  document.getElementById('fData').value = riga.data;
  document.getElementById('fDescrizione').value = riga.descrizione;
  fImporto.value = formattaImportoInput(riga.importo);
  document.getElementById('fNote').value = riga.note || '';
  document.getElementById('fPagato').checked = riga.pagato;
  modalOverlay.classList.remove('hidden');
}

function chiudiModale() {
  modalOverlay.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const importoNumerico = parseImportoIT(fImporto.value);
  if (isNaN(importoNumerico) || importoNumerico < 0) {
    mostraToast('⚠️ Importo non valido. Es: 1.000,00 oppure 50,00');
    fImporto.focus();
    return;
  }

  const id = document.getElementById('fId').value;
  const payload = {
    data: document.getElementById('fData').value,
    descrizione: document.getElementById('fDescrizione').value.trim(),
    importo: importoNumerico,
    note: document.getElementById('fNote').value.trim(),
    pagato: document.getElementById('fPagato').checked,
  };

  if (id) {
    await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    mostraToast('Attività aggiornata');
  } else {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    mostraToast('Attività aggiunta');
  }

  chiudiModale();
  aggiornaTutto();
});

// ---------- Eliminazione (sposta nel cestino) ----------
const confirmOverlay = document.getElementById('confirmOverlay');
let idDaEliminare = null;

function apriConfermaElimina(id) {
  idDaEliminare = id;
  confirmOverlay.classList.remove('hidden');
}
document.getElementById('btnAnnullaElimina').addEventListener('click', () => {
  idDaEliminare = null;
  confirmOverlay.classList.add('hidden');
});
document.getElementById('btnConfermaElimina').addEventListener('click', async () => {
  if (idDaEliminare) {
    await fetch(`${API}/${idDaEliminare}`, { method: 'DELETE' });
    mostraToast('Attività spostata nel cestino');
  }
  confirmOverlay.classList.add('hidden');
  idDaEliminare = null;
  aggiornaTutto();
});
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.add('hidden');
    idDaEliminare = null;
  }
});

// ---------- Cestino ----------
const cestinoOverlay = document.getElementById('cestinoOverlay');
const cestinoLista = document.getElementById('cestinoLista');
const cestinoVuoto = document.getElementById('cestinoVuoto');

document.getElementById('btnCestino').addEventListener('click', apriCestino);
document.getElementById('btnChiudiCestino').addEventListener('click', () => cestinoOverlay.classList.add('hidden'));
cestinoOverlay.addEventListener('click', (e) => { if (e.target === cestinoOverlay) cestinoOverlay.classList.add('hidden'); });

async function apriCestino() {
  cestinoOverlay.classList.remove('hidden');
  await caricaCestino();
}

async function caricaCestino() {
  const res = await fetch(CESTINO_API);
  const dati = await res.json();

  cestinoLista.innerHTML = '';
  if (dati.length === 0) {
    cestinoVuoto.classList.remove('hidden');
    return;
  }
  cestinoVuoto.classList.add('hidden');

  for (const riga of dati) {
    const div = document.createElement('div');
    div.className = 'cestino-item';
    div.innerHTML = `
      <div class="cestino-item-info">
        <strong>${escapeHtml(riga.descrizione)} — ${formattaEuro(riga.importo)}</strong>
        <span>Eliminato il ${riga.eliminato_il || ''} · Data attività ${formattaDataIT(riga.data)}</span>
      </div>
      <div class="cestino-item-azioni">
        <button class="btn btn-outline btn-small" data-ripristina="${riga.id}">↩️ Ripristina</button>
        <button class="btn btn-danger btn-small" data-elimina-def="${riga.id}">Elimina def.</button>
      </div>
    `;
    cestinoLista.appendChild(div);
  }
}

cestinoLista.addEventListener('click', async (e) => {
  const ripristinaId = e.target.closest('[data-ripristina]')?.dataset.ripristina;
  const eliminaDefId = e.target.closest('[data-elimina-def]')?.dataset.eliminaDef;

  if (ripristinaId) {
    await fetch(`${CESTINO_API}/${ripristinaId}/ripristina`, { method: 'POST' });
    mostraToast('Attività ripristinata');
    await caricaCestino();
    aggiornaTutto();
  }
  if (eliminaDefId) {
    if (confirm('Eliminare definitivamente? Non sarà più recuperabile.')) {
      await fetch(`${CESTINO_API}/${eliminaDefId}`, { method: 'DELETE' });
      mostraToast('Eliminato definitivamente');
      await caricaCestino();
      aggiornaTutto();
    }
  }
});

document.getElementById('btnSvuotaCestino').addEventListener('click', async () => {
  if (confirm('Svuotare completamente il cestino? Tutti gli elementi verranno eliminati definitivamente.')) {
    await fetch(CESTINO_API, { method: 'DELETE' });
    mostraToast('Cestino svuotato');
    await caricaCestino();
    aggiornaTutto();
  }
});

// ---------- Stampa ----------
document.getElementById('btnStampa').addEventListener('click', () => {
  document.getElementById('printDate').textContent = 'Generato il ' + new Date().toLocaleDateString('it-IT');
  window.print();
});

// ---------- Avvio ----------
aggiornaTutto();
