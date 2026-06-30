const API = '/api/attivita';
const STATS_API = '/api/stats';
const CLIENTI_API = '/api/clienti';

let filtroStato = 'tutti';
let filtroClienteId = 'tutti';
let testoCerca = '';
let datiCorrenti = [];
let clientiCorrenti = [];

const contenitoreGruppi = document.getElementById('contenitoreGruppi');
const vuotoMsg = document.getElementById('vuoto');

// ---------- Utility numeri / valute (formato italiano: punto migliaia, virgola decimali) ----------

function parseImportoIT(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim();
  if (s === '') return NaN;

  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  return parseFloat(s);
}

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Caricamento clienti ----------
async function caricaClienti() {
  const res = await fetch(CLIENTI_API);
  clientiCorrenti = await res.json();

  // Popola select filtro
  const selFiltro = document.getElementById('filtroCliente');
  const valorePrecedente = selFiltro.value || 'tutti';
  selFiltro.innerHTML = '<option value="tutti">👥 Tutti i clienti</option>';
  for (const c of clientiCorrenti) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.nome} (${c.num_attivita})`;
    selFiltro.appendChild(opt);
  }
  selFiltro.value = clientiCorrenti.some(c => String(c.id) === String(valorePrecedente)) ? valorePrecedente : 'tutti';

  // Popola select form
  const selForm = document.getElementById('fCliente');
  const valoreForm = selForm.value;
  selForm.innerHTML = '<option value="">Seleziona cliente...</option>';
  for (const c of clientiCorrenti) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    selForm.appendChild(opt);
  }
  if (valoreForm) selForm.value = valoreForm;
}

// ---------- Caricamento dati ----------
async function caricaStats() {
  const params = new URLSearchParams();
  if (filtroClienteId !== 'tutti') params.set('cliente_id', filtroClienteId);
  const res = await fetch(`${STATS_API}?${params.toString()}`);
  const stats = await res.json();
  document.getElementById('statTotale').textContent = formattaEuro(stats.totale);
  document.getElementById('statTotaleNum').textContent = `${stats.numero_totale} voci`;
  document.getElementById('statPagato').textContent = formattaEuro(stats.pagato);
  document.getElementById('statPagatoNum').textContent = `${stats.numero_pagati} voci`;
  document.getElementById('statDaPagare').textContent = formattaEuro(stats.da_pagare);
  document.getElementById('statDaPagareNum').textContent = `${stats.numero_da_pagare} voci`;
}

async function caricaTabella() {
  const params = new URLSearchParams();
  params.set('filtro', filtroStato);
  if (filtroClienteId !== 'tutti') params.set('cliente_id', filtroClienteId);

  const res = await fetch(`${API}?${params.toString()}`);
  let dati = await res.json();

  if (testoCerca.trim()) {
    const q = testoCerca.trim().toLowerCase();
    dati = dati.filter(r => r.descrizione.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q));
  }

  datiCorrenti = dati;
  renderGruppi(dati);
  aggiornaTotaleVisualizzato(dati);
}

function aggiornaTotaleVisualizzato(dati) {
  const somma = dati.reduce((acc, r) => acc + Number(r.importo), 0);
  document.getElementById('footTotale').textContent = formattaEuro(somma);
}

// Raggruppa le righe per cliente (cliente "Senza cliente" per quelle non assegnate)
function raggruppaPerCliente(dati) {
  const gruppi = new Map();
  for (const riga of dati) {
    const chiave = riga.cliente_id || 'senza';
    if (!gruppi.has(chiave)) {
      gruppi.set(chiave, {
        nome: riga.cliente_nome || 'Senza cliente',
        colore: riga.cliente_colore || '#94a3b8',
        righe: [],
      });
    }
    gruppi.get(chiave).righe.push(riga);
  }
  // Ordina i gruppi per nome cliente
  return [...gruppi.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'it'));
}

function renderGruppi(dati) {
  contenitoreGruppi.innerHTML = '';

  if (dati.length === 0) {
    vuotoMsg.classList.remove('hidden');
    return;
  }
  vuotoMsg.classList.add('hidden');

  const gruppi = raggruppaPerCliente(dati);

  for (const [chiave, gruppo] of gruppi) {
    const sommaGruppo = gruppo.righe.reduce((acc, r) => acc + Number(r.importo), 0);

    const sezione = document.createElement('section');
    sezione.className = 'gruppo-cliente';
    sezione.innerHTML = `
      <div class="gruppo-header" style="--colore-cliente: ${gruppo.colore}">
        <span class="gruppo-pallino"></span>
        <h3>${escapeHtml(gruppo.nome)}</h3>
        <span class="gruppo-conteggio">${gruppo.righe.length} attività</span>
        <span class="gruppo-totale">${formattaEuro(sommaGruppo)}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Attività realizzata</th>
              <th>Importo</th>
              <th>Stato</th>
              <th class="no-print">Note</th>
              <th class="no-print">Azioni</th>
            </tr>
          </thead>
          <tbody></tbody>
          <tfoot>
            <tr class="riga-totale">
              <td colspan="2">Totale ${escapeHtml(gruppo.nome)}</td>
              <td>${formattaEuro(sommaGruppo)}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const tbody = sezione.querySelector('tbody');
    for (const riga of gruppo.righe) {
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

    contenitoreGruppi.appendChild(sezione);
  }
}

async function aggiornaTutto() {
  await Promise.all([caricaTabella(), caricaStats()]);
}

// ---------- Click su tabella (delegato, contenitore dinamico) ----------
contenitoreGruppi.addEventListener('click', async (e) => {
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
document.getElementById('filtroStato').addEventListener('click', (e) => {
  const btn = e.target.closest('.filtro-btn');
  if (!btn) return;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroStato = btn.dataset.filtro;
  caricaTabella();
});

document.getElementById('filtroCliente').addEventListener('change', (e) => {
  filtroClienteId = e.target.value;
  aggiornaTutto();
});

document.getElementById('cercaInput').addEventListener('input', (e) => {
  testoCerca = e.target.value;
  caricaTabella();
});

// ---------- Modale Nuova/Modifica attività ----------
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('formAttivita');
const fImporto = document.getElementById('fImporto');
const fCliente = document.getElementById('fCliente');

document.getElementById('btnNuovo').addEventListener('click', () => apriModaleNuovo());
document.getElementById('btnAnnulla').addEventListener('click', chiudiModale);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) chiudiModale(); });

fImporto.addEventListener('blur', () => {
  const valore = parseImportoIT(fImporto.value);
  if (!isNaN(valore)) {
    fImporto.value = formattaImportoInput(valore);
  }
});

document.getElementById('btnNuovoClienteInline').addEventListener('click', () => {
  apriClienti(true);
});

function apriModaleNuovo() {
  document.getElementById('modalTitolo').textContent = 'Nuova attività';
  form.reset();
  document.getElementById('fId').value = '';
  document.getElementById('fData').value = new Date().toISOString().slice(0, 10);
  if (filtroClienteId !== 'tutti') fCliente.value = filtroClienteId;
  modalOverlay.classList.remove('hidden');
  document.getElementById('fDescrizione').focus();
}

function apriModaleModifica(id) {
  const riga = datiCorrenti.find(r => String(r.id) === String(id));
  if (!riga) return;
  document.getElementById('modalTitolo').textContent = 'Modifica attività';
  document.getElementById('fId').value = riga.id;
  fCliente.value = riga.cliente_id || '';
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

  if (!fCliente.value) {
    mostraToast('⚠️ Seleziona un cliente');
    return;
  }

  const id = document.getElementById('fId').value;
  const payload = {
    cliente_id: Number(fCliente.value),
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

// ---------- Eliminazione (definitiva) ----------
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

// ---------- Gestione Clienti ----------
const clientiOverlay = document.getElementById('clientiOverlay');
const clientiLista = document.getElementById('clientiLista');
const clientiVuoto = document.getElementById('clientiVuoto');
const formClienteNuovo = document.getElementById('formClienteNuovo');

document.getElementById('btnClienti').addEventListener('click', () => apriClienti(false));
document.getElementById('btnChiudiClienti').addEventListener('click', () => clientiOverlay.classList.add('hidden'));
clientiOverlay.addEventListener('click', (e) => { if (e.target === clientiOverlay) clientiOverlay.classList.add('hidden'); });

async function apriClienti(focusNuovo) {
  clientiOverlay.classList.remove('hidden');
  await renderClientiLista();
  if (focusNuovo) document.getElementById('fNuovoClienteNome').focus();
}

async function renderClientiLista() {
  await caricaClienti();
  clientiLista.innerHTML = '';
  if (clientiCorrenti.length === 0) {
    clientiVuoto.classList.remove('hidden');
    return;
  }
  clientiVuoto.classList.add('hidden');

  for (const c of clientiCorrenti) {
    const div = document.createElement('div');
    div.className = 'cliente-item';
    const haAttivita = c.num_attivita > 0;
    div.innerHTML = `
      <span class="cliente-pallino" style="background:${c.colore}"></span>
      <input type="text" class="cliente-nome-input" data-id="${c.id}" value="${escapeHtml(c.nome)}">
      <input type="color" class="cliente-colore-input" data-id="${c.id}" value="${c.colore}">
      <span class="cliente-num">${c.num_attivita} attività</span>
      <button class="icon-btn ${haAttivita ? 'icon-btn-disabled' : ''}" data-elimina-cliente="${c.id}" title="${haAttivita ? 'Non eliminabile: ha attività collegate' : 'Elimina cliente'}">🗑️</button>
    `;
    clientiLista.appendChild(div);
  }
}

formClienteNuovo.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('fNuovoClienteNome').value.trim();
  const colore = document.getElementById('fNuovoClienteColore').value;
  if (!nome) return;

  const res = await fetch(CLIENTI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, colore }),
  });
  if (res.ok) {
    mostraToast('Cliente creato');
    formClienteNuovo.reset();
    document.getElementById('fNuovoClienteColore').value = '#2563eb';
    await renderClientiLista();
  } else {
    const err = await res.json();
    mostraToast('⚠️ ' + (err.errore || 'Errore creazione cliente'));
  }
});

clientiLista.addEventListener('change', async (e) => {
  const nomeInput = e.target.closest('.cliente-nome-input');
  const coloreInput = e.target.closest('.cliente-colore-input');
  if (nomeInput) {
    await fetch(`${CLIENTI_API}/${nomeInput.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeInput.value.trim() }),
    });
    mostraToast('Cliente aggiornato');
    await caricaClienti();
    caricaTabella();
  }
  if (coloreInput) {
    await fetch(`${CLIENTI_API}/${coloreInput.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colore: coloreInput.value }),
    });
    await renderClientiLista();
    caricaTabella();
  }
});

clientiLista.addEventListener('click', async (e) => {
  const eliminaId = e.target.closest('[data-elimina-cliente]')?.dataset.eliminaCliente;
  if (eliminaId) {
    if (confirm('Eliminare questo cliente?')) {
      const res = await fetch(`${CLIENTI_API}/${eliminaId}`, { method: 'DELETE' });
      if (res.ok) {
        mostraToast('Cliente eliminato');
        await renderClientiLista();
        aggiornaTutto();
      } else {
        const err = await res.json();
        mostraToast('⚠️ ' + (err.errore || 'Impossibile eliminare il cliente'));
      }
    }
  }
});

// ---------- Stampa ----------
document.getElementById('btnStampa').addEventListener('click', () => {
  document.getElementById('printDate').textContent = 'Generato il ' + new Date().toLocaleDateString('it-IT') + ' alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const etichette = { tutti: 'Tutti gli stati', pagati: 'Solo pagati', da_pagare: 'Solo da pagare' };
  let testoFiltro = `Stato: ${etichette[filtroStato]}`;
  if (filtroClienteId !== 'tutti') {
    const c = clientiCorrenti.find(c => String(c.id) === String(filtroClienteId));
    testoFiltro += ` · Cliente: ${c ? c.nome : ''}`;
  } else {
    testoFiltro += ' · Tutti i clienti';
  }
  document.getElementById('printFiltro').textContent = testoFiltro;
  window.print();
});

// ---------- Avvio ----------
(async function init() {
  await caricaClienti();
  await aggiornaTutto();
})();
