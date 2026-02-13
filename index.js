const http = require("http");

const PORT = process.env.PORT || 3000;
const startTime = Date.now();

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });

  res.end(`
<!DOCTYPE html>
<html>
<head>
<title>Telegram Forward Bot</title>
<style>
body {
  margin: 0;
  font-family: 'Courier New', monospace;
  background: #0f0f0f;
  color: #00ffcc;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.container {
  text-align: center;
  padding: 40px;
  border: 2px solid #00ffcc;
  border-radius: 20px;
  box-shadow: 0 0 20px #00ffcc, 0 0 40px #00ffcc inset;
  width: 400px;
  animation: glow 2s infinite alternate;
}

h1 {
  margin-bottom: 10px;
  font-size: 24px;
  text-shadow: 0 0 10px #00ffcc;
}

.status {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #00ffcc;
  border-radius: 10px;
  box-shadow: 0 0 10px #00ffcc inset;
}

.uptime {
  margin-top: 15px;
  font-size: 14px;
  color: #00ffaa;
}

@keyframes glow {
  from { box-shadow: 0 0 10px #00ffcc; }
  to { box-shadow: 0 0 25px #00ffcc; }
}

.footer {
  margin-top: 20px;
  font-size: 12px;
  color: #008f7a;
}
</style>
</head>

<body>
<div class="container">
  <h1>🚀 TELEGRAM FORWARD BOT</h1>
  <div class="status">🟢 SYSTEM ONLINE</div>
  <div class="uptime" id="uptime">Uptime: calculating...</div>
  <div class="footer">Powered by Node.js • Render</div>
</div>

<script>
const startTime = ${startTime};

function updateUptime() {
  const now = Date.now();
  const diff = now - startTime;

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  document.getElementById("uptime").innerText =
    "Uptime: " + days + "d " + hours + "h " + minutes + "m " + seconds + "s";
}

setInterval(updateUptime, 1000);
updateUptime();
</script>

</body>
</html>
  `);
}).listen(PORT, () => {
  console.log("🌐 Neon status page running on port", PORT);
});


const { startUserClient } = require("./userClient");
const { startForwarding } = require("./forwarder");
require("./bot");

(async () => {
  await startUserClient();

  // ✅ MUST await (prevents old message forwarding)
  await startForwarding();

  console.log("🚀 Bot started successfully");
})();
