const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running");
}).listen(PORT, () => {
  console.log("🌐 Server running on port", PORT);
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
