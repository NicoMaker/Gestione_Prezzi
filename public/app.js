const API = '/api/attivita';
const STATS_API = '/api/stats';

let filtroCorrente = 'tutti';
let testoCerca = '';
let datiCorrenti = [];

const tbody = document.getElementById('tbody');
const vuotoMsg = document.getElementById('vuoto');

// ---------- Utility ----------
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
  document.getElementById('footTotale').textContent = formattaEuro(stats.totale);
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
          <button class="icon-btn" data-elimina="${riga.id}" title="Elimina">🗑️</button>
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

document.getElementById('btnNuovo').addEventListener('click', () => apriModaleNuovo());
document.getElementById('btnAnnulla').addEventListener('click', chiudiModale);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) chiudiModale(); });

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
  document.getElementById('fImporto').value = riga.importo;
  document.getElementById('fNote').value = riga.note || '';
  document.getElementById('fPagato').checked = riga.pagato;
  modalOverlay.classList.remove('hidden');
}

function chiudiModale() {
  modalOverlay.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('fId').value;
  const payload = {
    data: document.getElementById('fData').value,
    descrizione: document.getElementById('fDescrizione').value.trim(),
    importo: parseFloat(document.getElementById('fImporto').value),
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

// ---------- Eliminazione ----------
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
    mostraToast('Attività eliminata');
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

// ---------- Stampa ----------
document.getElementById('btnStampa').addEventListener('click', () => {
  document.getElementById('printDate').textContent = 'Generato il ' + new Date().toLocaleDateString('it-IT');
  window.print();
});

// ---------- Avvio ----------
aggiornaTutto();
