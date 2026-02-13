const { startUserClient } = require("./userClient");
const { startForwarding } = require("./forwarder");
require("./bot");

(async () => {
  await startUserClient();

  // ✅ MUST await (prevents old message forwarding)
  await startForwarding();

  console.log("🚀 Bot started successfully");
})();
