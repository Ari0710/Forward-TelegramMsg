const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require("fs");
const env = require("./env");

const session = fs.existsSync(env.sessionFile)
  ? fs.readFileSync(env.sessionFile, "utf8")
  : "";

const client = new TelegramClient(
  new StringSession(session),
  env.apiId,
  env.apiHash,
  { connectionRetries: 5 }
);

async function startUserClient() {
  await client.start({
    phoneNumber: async () => input.text("Phone: "),
    phoneCode: async () => input.text("Code: "),
    password: async () => input.text("2FA password (if any): "),
  });

  fs.writeFileSync(env.sessionFile, client.session.save());
  console.log("✅ User client logged in");
}

module.exports = { client, startUserClient };
