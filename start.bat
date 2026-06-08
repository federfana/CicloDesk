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
      :: robocopy /XO copia solo se il source (cloud) è più recente del dest (locale)
      :: Exit code: 0=nessuna copia, 1=file copiato, >=8=errore
      robocopy "%SYNC_FOLDER%" "data" officina.db /XO /R:0 /W:0 /NJH /NJS /NDL /NFL >nul 2>&1
      set RC=%ERRORLEVEL%
      IF %RC% EQU 1 (
        echo  [SYNC] Il database cloud e' piu' recente - aggiornato.
        :: Elimina file WAL/SHM per evitare corruzione
        IF EXIST "data\officina.db-wal" del "data\officina.db-wal"
        IF EXIST "data\officina.db-shm" del "data\officina.db-shm"
      ) ELSE IF %RC% GEQ 8 (
        echo  [SYNC] ERRORE durante il confronto - uso database locale.
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