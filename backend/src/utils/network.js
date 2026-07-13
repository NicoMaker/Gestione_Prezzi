// Utility di rete per il banner di avvio
const os = require("os");

function getLocalIP() {
  const interfacce = os.networkInterfaces();
  for (const nome of Object.keys(interfacce)) {
    for (const i of interfacce[nome]) {
      if (i.family === "IPv4" && !i.internal) {
        return i.address;
      }
    }
  }
  return "localhost";
}

async function getPublicIP() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return data.ip;
  } catch (err) {
    return "non disponibile (nessuna connessione internet?)";
  }
}

module.exports = { getLocalIP, getPublicIP };
