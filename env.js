module.exports = {
  apiId: Number(process.env.API_ID),
  apiHash: process.env.API_HASH,
  botToken: process.env.BOT_TOKEN,
  sessionFile: "session.txt",
  adminIds: process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(",").map(Number)
    : []
};
