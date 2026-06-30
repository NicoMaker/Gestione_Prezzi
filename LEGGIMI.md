# Gestione Attività & Pagamenti

App completa per gestire le tue attività realizzate e i relativi pagamenti, con database SQLite, modifica/eliminazione, filtri e stampa per il cliente.

## Requisiti

- **Node.js versione 22.5 o superiore** (usa il database SQLite integrato di Node, nessuna installazione extra di SQLite necessaria).
  Verifica la tua versione con: `node -v`
  Se hai una versione precedente, scaricala da https://nodejs.org

## Installazione (solo la prima volta)

1. Apri il terminale dentro questa cartella (`gestione-pagamenti`)
2. Esegui:
   ```
   npm install
   ```

## Avvio dell'app

```
npm start
```

Poi apri il browser su:

```
http://localhost:3000
```

Al primo avvio viene creato automaticamente il file del database in `data/gestione.db`, già precompilato con i dati che mi hai fornito (Pagato € 650,00 / Da Pagare € 850,00).

Le volte successive, il database mantiene tutte le modifiche che fai (non si resetta).

## Funzionalità

- **Aggiungere** una nuova attività (data, descrizione, importo, note, stato pagamento) con il pulsante "+ Nuova attività"
- **Modificare** qualsiasi riga con la matita ✏️
- **Eliminare** una riga con il cestino 🗑️ (richiede conferma)
- **Cambiare stato pagato/da pagare** con un click sul badge ✅/⏳: i totali "Pagato" e "Da pagare" si aggiornano automaticamente
- **Filtrare** per "Tutti / Pagati / Da pagare"
- **Cercare** per descrizione o note
- **Stampare** un report pulito da consegnare al cliente (pulsante "🖨️ Stampa" — nasconde automaticamente pulsanti e colonne non necessarie)
- Riepilogo in alto con totale complessivo, totale pagato e totale da pagare, sempre calcolati in automatico dal database

## Struttura del progetto

```
gestione-pagamenti/
├── server.js          → server Node/Express con le API
├── db.js              → creazione/connessione del database SQLite + dati iniziali
├── package.json
├── data/
│   └── gestione.db    → il database (creato automaticamente al primo avvio)
└── public/
    ├── index.html      → interfaccia
    ├── style.css        → stile
    └── app.js           → logica (chiamate API, filtri, stampa, modali)
```

## Backup dei dati

Tutti i tuoi dati vivono nel singolo file `data/gestione.db`. Per fare un backup basta copiare quel file altrove.
