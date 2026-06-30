GESTIONE ATTIVITA' & PAGAMENTI - v3 (clienti, senza cestino)
===============================================================

INSTALLAZIONE:
1. Estrai lo zip in una cartella
2. Apri il terminale in quella cartella
3. Esegui: npm install
4. Esegui: npm start
5. Apri il browser su http://localhost:3000

FUNZIONALITA':
- Gestione clienti: crea, rinomina, assegna un colore ed elimina clienti (pulsante "Clienti" in alto)
- Un cliente con attività collegate NON puo' essere eliminato: il pulsante elimina risulta disabilitato
  finche' non sposti/elimini prima tutte le sue attività
- Ogni attività va assegnata a un cliente
- Filtro per cliente, oltre al filtro Tutti/Pagati/Da pagare e alla ricerca testuale
- Le attività sono raggruppate per cliente, sia a schermo che in stampa, con totale per cliente e totale generale
- L'eliminazione di un'attività è DEFINITIVA (nessun cestino): viene chiesta conferma prima di procedere
- Importi sempre in formato italiano: punto ogni 3 cifre per le migliaia, virgola per i decimali (es. 1.000,00)
- Stampa (pulsante "Stampa") riporta data/ora di generazione e i filtri applicati, organizzata per cliente

NOTE TECNICHE:
- Il database SQLite si trova in data/gestione.db e viene creato automaticamente al primo avvio
- Richiede Node.js >= 22.5.0 (per il modulo node:sqlite nativo)
