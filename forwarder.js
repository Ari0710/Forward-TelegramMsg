const fs = require("fs");
const { NewMessage } = require("telegram/events");
const { client } = require("./userClient");

const POLL_INTERVAL = 5; // seconds
const LAST_FILE = "last_messages.json";

let pollingTimer = null;
let eventHandler = null;

// ---------------- HELPERS ----------------
function readCfg() {
  return JSON.parse(fs.readFileSync("config.json", "utf8"));
}

function loadLast() {
  if (!fs.existsSync(LAST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(LAST_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveLast(data) {
  fs.writeFileSync(LAST_FILE, JSON.stringify(data, null, 2));
}

// ---------------- INIT (CRITICAL FIX) ----------------
// Mark latest message IDs so old msgs won't forward
async function markLatestMessages() {
  const cfg = readCfg();
  if (!cfg.sources?.length) return;

  const last = loadLast();

  for (const sourceId of cfg.sources) {
    try {
      const msgs = await client.getMessages(sourceId, { limit: 1 });
      if (!msgs?.length) continue;

      last[sourceId] = msgs[0].id;
      console.log("📝 Startup mark:", sourceId, msgs[0].id);
    } catch (e) {
      console.error("Mark error:", sourceId, e.message);
    }
  }

  saveLast(last);
}

// ---------------- POLLING ----------------
async function pollOnce() {
  const cfg = readCfg();
  if (!cfg.forwarding || !cfg.destination) return;

  const last = loadLast();

  for (const sourceId of cfg.sources) {
    try {
      const msgs = await client.getMessages(sourceId, { limit: 5 });
      if (!msgs?.length) continue;

      msgs.reverse(); // old → new

      for (const msg of msgs) {
        const lastId = last[sourceId] || 0;
        if (msg.id <= lastId) continue;

        await client.forwardMessages(cfg.destination, {
          messages: [msg.id],
          fromPeer: sourceId,
        });

        last[sourceId] = msg.id;
        saveLast(last);

        console.log("🐢 Poll forward:", sourceId, msg.id);
      }
    } catch (e) {
      console.error("Poll error:", sourceId, e.message);
    }
  }
}

// ---------------- EVENT FORWARDING ----------------
function startEventForwarding() {
  if (eventHandler) return;

  eventHandler = new NewMessage({});

  client.addEventHandler(async (event) => {
    const cfg = readCfg();
    if (!cfg.forwarding || !cfg.destination) return;

    const msg = event.message;
    if (!msg?.peerId?.channelId) return;

    const sourceId = Number(`-100${msg.peerId.channelId}`);
    if (!cfg.sources.includes(sourceId)) return;

    const last = loadLast();
    const lastId = last[sourceId] || 0;

    if (msg.id <= lastId) return; // 🔒 DEDUP

    try {
      await client.forwardMessages(cfg.destination, {
        messages: [msg.id],
        fromPeer: msg.peerId,
      });

      last[sourceId] = msg.id;
      saveLast(last);

      console.log("⚡ Event forward:", sourceId, msg.id);
    } catch (e) {
      console.error("Event error:", e.message);
    }
  }, eventHandler);
}

// ---------------- CONTROL ----------------
async function startForwarding() {
  // 🔥 KEY: prevent old message forwarding
  await markLatestMessages();

  if (!pollingTimer) {
    pollingTimer = setInterval(pollOnce, POLL_INTERVAL * 1000);
    console.log("▶ Polling started");
  }

  startEventForwarding();
}

function stopForwarding() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }

  if (eventHandler) {
    client.removeEventHandler(eventHandler);
    eventHandler = null;
  }

  console.log("⏹ Forwarding stopped");
}

module.exports = {
  startForwarding,
  stopForwarding,
};
