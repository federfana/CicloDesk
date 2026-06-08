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

:: ── Cloud Sync ─────────────────────────────────────────────────
:: Imposta qui il percorso della cartella Google Drive / Dropbox / OneDrive
:: Esempi:
::   set SYNC_FOLDER=C:\Users\TuoNome\Google Drive\CicloDesk
::   set SYNC_FOLDER=C:\Users\TuoNome\Dropbox\CicloDesk
::   set SYNC_FOLDER=C:\Users\TuoNome\OneDrive\CicloDesk
:: Lascia vuoto per disattivare la sincronizzazione.
set SYNC_FOLDER=H:\Il mio Drive\CicloDesk

IF NOT "%SYNC_FOLDER%"=="" (
  echo.
  echo  [SYNC] Percorsi configurati:
  echo         Locale: %CD%\data\officina.db
  echo         Cloud:  %SYNC_FOLDER%\officina.db
  echo.
  IF NOT EXIST "%SYNC_FOLDER%" mkdir "%SYNC_FOLDER%"
  IF EXIST "%SYNC_FOLDER%\officina.db" (
    IF NOT EXIST "data\officina.db" (
      echo  [SYNC] File locale mancante - scarico dal cloud...
      copy /Y "%SYNC_FOLDER%\officina.db" "data\officina.db" >nul
      echo  [SYNC] Database scaricato dal cloud.
    ) ELSE (
      echo  [SYNC] Confronto versioni...
      :: Usa forfiles per ottenere date affidabili in formato confrontabile
      for %%A in ("data\officina.db") do set LOCAL_SIZE=%%~zA
      for %%B in ("%SYNC_FOLDER%\officina.db") do set CLOUD_SIZE=%%~zB
      :: Usa xcopy /D per confronto date affidabile (copia solo se source è più recente)
      echo n | xcopy /D "%SYNC_FOLDER%\officina.db" "data\officina.db" >nul 2>&1
      IF %ERRORLEVEL% EQU 0 (
        echo  [SYNC] Il database cloud e' piu' recente - aggiornato.
      ) ELSE (
        echo  [SYNC] Il database locale e' gia' aggiornato.
      )
    )
  ) ELSE (
    echo  [SYNC] Nessun database nel cloud, uso quello locale.
  )
)

echo.
npm start

:: ── Salvataggio su cloud alla chiusura ─────────────────────────
IF NOT "%SYNC_FOLDER%"=="" (
  IF EXIST "data\officina.db" (
    echo.
    echo  [SYNC] Salvataggio database sul cloud...
    copy /Y "data\officina.db" "%SYNC_FOLDER%\officina.db" >nul
    echo  [SYNC] Database salvato in: %SYNC_FOLDER%
  )
)

pause