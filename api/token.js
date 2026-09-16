export default function handler(req, res) {
  return res.status(200).json({ token: process.env.DISCORD_TOKEN, appId: process.env.DISCORD_APP_ID });
}