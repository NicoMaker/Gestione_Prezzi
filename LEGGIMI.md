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
- **Importo in formato italiano**: scrivi gli importi con la virgola per i decimali e il punto per le migliaia, es. `1.000,00` oppure semplicemente `50` o `50,5` — il campo si auto-formatta quando esci da esso
- **Modificare** qualsiasi riga con la matita ✏️
- **Eliminare** una riga con il cestino 🗑️ (non è cancellata subito: finisce nel Cestino)
- **Cestino**: le attività eliminate restano recuperabili nel Cestino (pulsante in alto) per 30 giorni, poi vengono cancellate definitivamente in automatico ogni notte a mezzanotte. Dal Cestino puoi anche ripristinare singolarmente o svuotarlo subito
- **Cambiare stato pagato/da pagare** con un click sul badge ✅/⏳: i totali "Pagato" e "Da pagare" si aggiornano automaticamente
- **Filtrare** per "Tutti / Pagati / Da pagare": il totale a fondo tabella ora riflette correttamente solo le righe filtrate/cercate (non più sempre il totale generale)
- **Cercare** per descrizione o note
- **Stampare** un report pulito da consegnare al cliente (pulsante "🖨️ Stampa")
- Riepilogo in alto con totale complessivo, totale pagato e totale da pagare, sempre calcolati in automatico dal database
- All'avvio il server mostra in console l'indirizzo IP locale e pubblico a cui è raggiungibile

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
