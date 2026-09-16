export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('key') !== 'zen2k_voice_sync_888') {
    return new Response('Unauthorized', { status: 401 });
  }
  return new Response(JSON.stringify({
    token: process.env.DISCORD_TOKEN,
    appId: process.env.DISCORD_APP_ID,
    guildId: process.env.DISCORD_GUILD_ID
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
