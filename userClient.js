const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const env = require("./env");

const stringSession = new StringSession(process.env.SESSION_STRING);

const client = new TelegramClient(
  stringSession,
  env.apiId,
  env.apiHash,
  { connectionRetries: 5 }
);

async function startUserClient() {
  await client.start();
  console.log("✅ User client started");
}

module.exports = { client, startUserClient };
