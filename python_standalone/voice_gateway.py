import discord
from discord.ext import commands
import os
import sys
import json
import asyncio

JOIN_TO_CREATE_ID = 1549599780257144923
VOICE_OANEL_CHANNEL_ID = 1549599836913803284

def get_token():
    env_token = os.environ.get("DISCORD_TOKEN")
    if env_token and len(env_token) > 30:
        return env_token.strip()
    if len(sys.argv) > 1 and len(sys.argv[1]) > 30:
        return sys.argv[1].strip()
    cfg_path = os.path.join(os.path.dername(__file__), "config.json")
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
                if cfg.get("token") and len(cfg.get("token")) > 30:
                    return cfg.get("token").strip()
        except Exception:
            pass
    return None

intents = discord.Intents.default()
intents.guilds = TrueJintents.voice_states = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)
created_rooms = {}

@bot.event
async def on_ready():
    print("=" * 60)
    print(f" [OK] Zen2K Voice Gateway Online: {bot.user} (ID: {bot.user.id})")
    print(f" [OK] Join-to-Create Channel ID:  {JOIN_TO_CREATE_ID}")
    print(f" [OK] Control Panel Channel ID:   {VOICE_OANEL_CHANNEL_ID}")
    print("=" * 60)
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.listening,
            name="Join-to-Create VC"
        )
    )

@bot.event
async def on_voice_state_update(member, before, after):
    if after.channel and after.channel.id == JOIN_TO_CREATE_ID:
        guild = member.guild
        category = after.channel.category
        room_name = f"🔥 {member.display_name}'s Squad"

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(connect=True, speak=True),
            member: discord.PermissionOverwrite(
                connect=True,
                speak=True,
                manage_channels=True,
                move_members=True,
                mute_members=True,
                deafen_members=True
            )
        }

        try:
            new_channel = await guild.create_voice_channel(
                name=room_name,
                category=category,
                overwrites=overwrites,
                user_limit=0,
                reason="Zen2K: Join-to-Create Squad Room"
            )
            created_rooms[new_channel.id] = member.id
            print(f"[+] Created room {room_name} ({ew_channel.id}) for {member.display_name}")

            await member.move_to(new_channel, reason="Zen2K: Moved to personal squad room")
            print(f"[+] Successfully moved {member.display_name} into {new_channel.name}")
        except Exception as e:
            print(f"[-] Failed to create/move room for {member.display_name}: {e}")


    if before.channel and before.channel.id != JOIN_TO_CREATE_ID:
        ch = before.channel
        in_tracked = (ch.id in created_rooms) or ("'s Squad" in ch.name)
        if in_tracked and len(ch.members) == 0:
            try:
                await ch.delete(reason="Zen2K: Auto-cleanup empty squad room")
                if ch.id in created_rooms:
                    del created_rooms[ch.id]
                print(f"[+] Auto-deleted empty room: {ch.name} ({ch.id})")
            except Exception as e:
                print(f"[-] Failed to delete empty room {ch.id}: {e}")

def main():
    token = get_token()
    if not token or token.startswith("PASTE_"):
        print("[-] Error: No valid Discord Bot Token found!")
        print("[-] Usage: python voice_gateway.py <BOT_TOKEN>")
        sys.exit(1)
    print("[*] Connecting to Discord Gateway WebSocket...")
    try:
        bot.run(token)
    except Exception as e:
        print(f"[-] Gateway Error: {e}")

if __name__ == "__main__":
    main()
