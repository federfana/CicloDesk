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

npm start