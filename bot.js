const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const env = require("./env");
const { client } = require("./userClient");
const { startForwarding, stopForwarding } = require("./forwarder");

const bot = new TelegramBot(env.botToken, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

const PAGE_SIZE = 8;

// ---------------- CONFIG HELPERS ----------------
function readCfg() {
  return JSON.parse(fs.readFileSync("config.json", "utf8"));
}

function writeCfg(cfg) {
  fs.writeFileSync("config.json", JSON.stringify(cfg, null, 2));
}

// ---------------- ADMIN START NOTIFY + AUTO START ----------------
function notifyAdminsOnStart() {
  const time = new Date().toLocaleString();

  // force forwarding ON at startup
  const cfg = readCfg();
  if (!cfg.forwarding) {
    cfg.forwarding = true;
    writeCfg(cfg);
  }

  // attach forwarding handler
  startForwarding();

  const text =
    "🤖 *Forward Bot Started*\n" +
    "Forwarding: ON\n" +
    `Time: ${time}`;

  (env.adminIds || []).forEach(id => {
    bot.sendMessage(id, text, { parse_mode: "Markdown" }).catch(() => {});
  });
}

// ---------------- MAIN MENU ----------------
function mainMenu(chatId) {
  bot.sendMessage(chatId, "🛠 *Forward Control Panel*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Add Source", callback_data: "add_source_0" }],
        [{ text: "🎯 Set / Edit Target", callback_data: "set_target_0" }],
        [{ text: "❌ Remove Source", callback_data: "remove_source_0" }],
        [{ text: "🗑 Remove Target", callback_data: "remove_target" }],
        [{ text: "⏹ Stop Forwarding", callback_data: "stop" }],
        [{ text: "▶ Start Forwarding", callback_data: "start" }],
        [{ text: "📋 Status", callback_data: "status" }]
      ]
    }
  });
}

// ---------------- START COMMAND ----------------
bot.onText(/\/start/, (msg) => {
  if (!env.adminIds.includes(msg.from.id)) return;
  mainMenu(msg.chat.id);
});

// ---------------- CALLBACK HANDLER ----------------
bot.on("callback_query", async (q) => {
  if (!env.adminIds.includes(q.from.id)) return;

  const chatId = q.message.chat.id;
  const cfg = readCfg();

  // -------- ADD SOURCE --------
  if (q.data.startsWith("add_source_")) {
    const page = Number(q.data.split("_")[2]) || 0;
    const dialogs = await client.getDialogs({});
    const channels = dialogs.filter(d => d.isChannel);

    const start = page * PAGE_SIZE;
    const list = channels.slice(start, start + PAGE_SIZE);

    const keyboard = list.map(ch => ([
      { text: ch.name, callback_data: `addsrc_${ch.entity.id}` }
    ]));

    const nav = [];
    if (page > 0) nav.push({ text: "⬅ Prev", callback_data: `add_source_${page - 1}` });
    if (start + PAGE_SIZE < channels.length)
      nav.push({ text: "Next ➡", callback_data: `add_source_${page + 1}` });

    if (nav.length) keyboard.push(nav);
    keyboard.push([{ text: "🏠 Main Menu", callback_data: "menu" }]);

    bot.editMessageText("📢 *Select source channel*", {
      chat_id: chatId,
      message_id: q.message.message_id,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  if (q.data.startsWith("addsrc_")) {
    const id = Number(`-100${q.data.replace("addsrc_", "")}`);
    if (!cfg.sources.includes(id)) {
      cfg.sources.push(id);
      writeCfg(cfg);
      bot.answerCallbackQuery(q.id, { text: "✅ Source added" });
    } else {
      bot.answerCallbackQuery(q.id, { text: "ℹ Already added" });
    }
    return;
  }

  // -------- SET TARGET --------
  if (q.data.startsWith("set_target_")) {
    const page = Number(q.data.split("_")[2]) || 0;
    const dialogs = await client.getDialogs({});
    const channels = dialogs.filter(d => d.isChannel);

    const start = page * PAGE_SIZE;
    const list = channels.slice(start, start + PAGE_SIZE);

    const keyboard = list.map(ch => ([
      { text: ch.name, callback_data: `setdst_${ch.entity.id}` }
    ]));

    const nav = [];
    if (page > 0) nav.push({ text: "⬅ Prev", callback_data: `set_target_${page - 1}` });
    if (start + PAGE_SIZE < channels.length)
      nav.push({ text: "Next ➡", callback_data: `set_target_${page + 1}` });

    if (nav.length) keyboard.push(nav);
    keyboard.push([{ text: "🏠 Main Menu", callback_data: "menu" }]);

    bot.editMessageText("🎯 *Select target channel*", {
      chat_id: chatId,
      message_id: q.message.message_id,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  if (q.data.startsWith("setdst_")) {
    cfg.destination = Number(`-100${q.data.replace("setdst_", "")}`);
    writeCfg(cfg);
    bot.answerCallbackQuery(q.id, { text: "🎯 Target set" });
    return;
  }

  // -------- REMOVE SOURCE (SHOW NAMES) --------
  if (q.data.startsWith("remove_source_")) {
    if (!cfg.sources.length) {
      bot.answerCallbackQuery(q.id, { text: "No sources" });
      return;
    }

    const page = Number(q.data.split("_")[2]) || 0;
    const dialogs = await client.getDialogs({});
    const map = {};
    dialogs.forEach(d => {
      if (d.isChannel) map[`-100${d.entity.id}`] = d.name;
    });

    const start = page * PAGE_SIZE;
    const list = cfg.sources.slice(start, start + PAGE_SIZE);

    const keyboard = list.map(id => ([
      { text: `❌ ${map[id] || id}`, callback_data: `rmsrc_${id}` }
    ]));

    const nav = [];
    if (page > 0) nav.push({ text: "⬅ Prev", callback_data: `remove_source_${page - 1}` });
    if (start + PAGE_SIZE < cfg.sources.length)
      nav.push({ text: "Next ➡", callback_data: `remove_source_${page + 1}` });

    if (nav.length) keyboard.push(nav);
    keyboard.push([{ text: "🏠 Main Menu", callback_data: "menu" }]);

    bot.editMessageText("❌ *Remove source*", {
      chat_id: chatId,
      message_id: q.message.message_id,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  if (q.data.startsWith("rmsrc_")) {
    const id = Number(q.data.replace("rmsrc_", ""));
    cfg.sources = cfg.sources.filter(x => x !== id);
    writeCfg(cfg);
    bot.answerCallbackQuery(q.id, { text: "🗑 Source removed" });
    return;
  }

  // -------- REMOVE TARGET --------
  if (q.data === "remove_target") {
    cfg.destination = null;
    writeCfg(cfg);
    bot.answerCallbackQuery(q.id, { text: "🗑 Target removed" });
    return;
  }

  // -------- START / STOP --------
  if (q.data === "start") {
    cfg.forwarding = true;
    writeCfg(cfg);
    startForwarding();
    bot.answerCallbackQuery(q.id, { text: "▶ Forwarding started" });
  }

  if (q.data === "stop") {
    cfg.forwarding = false;
    writeCfg(cfg);
    stopForwarding();
    bot.answerCallbackQuery(q.id, { text: "⏹ Forwarding stopped" });
  }

  // -------- STATUS --------
  if (q.data === "status") {
    bot.sendMessage(chatId,
      `📊 *Status*\n\n` +
      `Sources: ${cfg.sources.length}\n` +
      `Target: ${cfg.destination}\n` +
      `Forwarding: ${cfg.forwarding}`,
      { parse_mode: "Markdown" }
    );
  }

  if (q.data === "menu") {
    mainMenu(chatId);
  }
});

// 🔔 RUN ON BOT START
notifyAdminsOnStart();
