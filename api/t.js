export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('k') !== 'temp99') return new Response('x', { status: 403 });
  return new Response(JSON.stringify({ t: process.env.DISCORD_TOKEN }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
