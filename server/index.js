const express = require('express');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Route API ──────────────────────────────────────────────────
app.use('/api/clienti',      require('./routes/clienti'));
app.use('/api/ordini',       require('./routes/ordini'));
app.use('/api/lavorazioni',  require('./routes/lavorazioni'));
app.use('/api/bici',         require('./routes/bici'));
app.use('/api/bici-clienti', require('./routes/bici-clienti'));

// ── Fallback SPA ───────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Avvio ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const nets  = os.networkInterfaces();
  const ipLan = Object.values(nets)
    .flat()
    .find(n => n.family === 'IPv4' && !n.internal)?.address || 'X.X.X.X';

  console.log('\n🚲  CicloDesk avviato!\n');
  console.log(`   💻  PC locale  → http://localhost:${PORT}`);
  console.log(`   📱  Telefono   → http://${ipLan}:${PORT}`);
  console.log('\n   (tutti i dispositivi devono essere sulla stessa rete Wi-Fi)\n');
});
