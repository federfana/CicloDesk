@echo off
echo.
echo  CicloDesk - Avvio server...
echo.

where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo  ERRORE: Node.js non trovato.
  echo  Scaricalo da https://nodejs.org
  pause
  exit /b 1
)

IF NOT EXIST node_modules (
  echo  Prima installazione - installo dipendenze...
  npm install
)

npm start
pause