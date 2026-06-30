GESTIONE ATTIVITA' & PAGAMENTI - v4
=====================================

INSTALLAZIONE:
1. Estrai lo zip in una cartella
2. Apri il terminale in quella cartella
3. Esegui: npm install
4. Esegui: npm start
5. Apri il browser su http://localhost:3000

FUNZIONALITA':
- Gestione clienti semplice: crea, rinomina ed elimina clienti (pulsante "Clienti" in alto). Niente colori,
  solo il nome.
- Un cliente con attività collegate NON puo' essere eliminato finche' non sposti/elimini prima le sue attività
- Ricerca cliente dappertutto: nel filtro principale, nel form di nuova/modifica attività e nella gestione
  clienti puoi digitare per cercare invece di scorrere un elenco lungo
- Filtro per cliente, oltre al filtro Tutti/Pagati/Da pagare e alla ricerca testuale sulle attività
- Le attività sono raggruppate per cliente, sia a schermo che in stampa, con totale per cliente e totale generale
- L'eliminazione di un'attività è DEFINITIVA: viene chiesta conferma prima di procedere
- Campo importo: accetta solo numeri, e formatta automaticamente in tempo reale mentre scrivi.
  Es. digitando "1000" diventa subito "1.000", digitando "1000000" diventa "1.000.000" (1 milione).
  Per i centesimi usa la virgola, es. "1000,50" -> "1.000,50"
- Stampa (pulsante "Stampa") riporta data/ora di generazione e i filtri applicati, organizzata per cliente

NOTE TECNICHE:
- Il database SQLite si trova in data/gestione.db e viene creato automaticamente al primo avvio
- Richiede Node.js >= 22.5.0 (per il modulo node:sqlite nativo)
