// Entry point: avvia il server HTTP
const creaApp = require("./src/app");
const { getLocalIP, getPublicIP } = require("./src/utils/network");

const PORT = process.env.PORT || 3000;

async function avvia() {
  const app = creaApp();
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server avviato con successo!`);
    console.log(`🌐 IP Pubblico: http://${publicIP}:${PORT}`);
    console.log(`🏠 IP Locale:   http://${localIP}:${PORT}`);
    console.log(`📍 Localhost:   http://localhost:${PORT}`);
    console.log(`\n--------------------------------------`);
  });
}

avvia();
