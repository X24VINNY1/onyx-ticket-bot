import os
import sys
import asyncio
import json
from aiohttp import web
import discord
from discord.ext import commands

PORT = int(os.environ.get("PORT", 10000))
TOKEN = os.environ.get("DISCORD_TOKEN", "").strip()

intents = discord.Intents.default()
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)

@bot.event
async def on_ready():
    activity = discord.Activity(type=discord.ActivityType.watching, name="Zen2K Tickets | 24/7 Cloud")
    await bot.change_presence(activity=activity, status=discord.Status.online)
    print(f"[+] Zen2K Bot logged in as {bot.user} (ID: {bot.user.id})")
    print("[+] Live on Render Cloud 24/7!")

# Health check route for Render
async def handle_health(request):
    return web.Response(text="Zen2K Discord Bot is Online 24/7!", status=200)

async def start_web_server():
    app = web.Application()
    app.router.add_get("/", handle_health)
    app.router.add_get("/healthz", handle_health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    print(f"[+] Web health server running on port {PORT}")

async def main():
    if not TOKEN:
        print("[!] ERROR: DISCORD_TOKEN environment variable not set.")
        sys.exit(1)
        
    await start_web_server()
    async with bot:
        await bot.start(TOKEN)

if __name__ == "__main__":
    asyncio.run(main())
