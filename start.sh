#!/bin/bash
echo ""
echo " CicloDesk - Avvio server..."
echo ""

if ! command -v node &> /dev/null; then
  echo " ERRORE: Node.js non trovato. Installalo da https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo " Prima installazione - installo dipendenze..."
  npm install
fi

# ── Cloud Sync ──────────────────────────────────────────────────
# Imposta qui il percorso della cartella Google Drive / Dropbox / OneDrive
# Esempi:
#   SYNC_FOLDER="$HOME/Google Drive/CicloDesk"
#   SYNC_FOLDER="$HOME/Dropbox/CicloDesk"
#   SYNC_FOLDER="$HOME/Library/CloudStorage/GoogleDrive-tuaemail/Il mio Drive/CicloDesk"
# Lascia vuoto per disattivare la sincronizzazione.
SYNC_FOLDER=""

DB_LOCAL="data/officina.db"

sync_download() {
  if [ -z "$SYNC_FOLDER" ]; then return; fi
  mkdir -p "$SYNC_FOLDER"
  if [ -f "$SYNC_FOLDER/officina.db" ]; then
    echo " [SYNC] Trovato database nel cloud..."
    if [ -f "$DB_LOCAL" ]; then
      LOCAL_TS=$(stat -f %m "$DB_LOCAL" 2>/dev/null || stat -c %Y "$DB_LOCAL")
      CLOUD_TS=$(stat -f %m "$SYNC_FOLDER/officina.db" 2>/dev/null || stat -c %Y "$SYNC_FOLDER/officina.db")
      if [ "$CLOUD_TS" -gt "$LOCAL_TS" ]; then
        echo " [SYNC] Il database cloud è più recente - scarico..."
        cp "$SYNC_FOLDER/officina.db" "$DB_LOCAL"
        # Elimina file WAL/SHM per evitare corruzione
        rm -f "${DB_LOCAL}-wal" "${DB_LOCAL}-shm"
        echo " [SYNC] Database aggiornato dal cloud."
      else
        echo " [SYNC] Il database locale è già aggiornato."
      fi
    else
      cp "$SYNC_FOLDER/officina.db" "$DB_LOCAL"
      echo " [SYNC] Database scaricato dal cloud."
    fi
  else
    echo " [SYNC] Nessun database nel cloud, uso quello locale."
  fi
}

sync_upload() {
  if [ -z "$SYNC_FOLDER" ]; then return; fi
  if [ -f "$DB_LOCAL" ]; then
    echo ""
    echo " [SYNC] Salvataggio database sul cloud..."
    cp "$DB_LOCAL" "$SYNC_FOLDER/officina.db"
    echo " [SYNC] Database salvato in: $SYNC_FOLDER"
  fi
}

# Scarica dal cloud all'avvio
sync_download

# Passa SYNC_FOLDER al server Node.js per auto-sync periodico
export SYNC_FOLDER

echo ""

# Salva sul cloud alla chiusura (Ctrl+C o chiusura terminale)
trap 'sync_upload; exit 0' INT TERM

npm start

# Salva anche dopo arresto normale
sync_upload