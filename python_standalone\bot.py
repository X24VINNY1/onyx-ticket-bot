import discord
from discord.ext import commands
from discord import app_commands
import json
import os
import sys
import asyncio
import database
import views
from transcripts import generate_transcript

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    return {}

def save_config(cfg):
    cfg_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(cfg_path, "w", encoding="utf-8-sig") as f:
        json.dump(cfg, f, indent=2)

config = load_config()

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True

bot = commands.Bot(
    command_prefix=config.get("prefix", "!"),
    intents=intents,
    help_command=None
)

@bot.event
async def on_ready():
    # Register persistent views for restart persistence
    bot.add_view(views.TicketLauncherView())
    bot.add_view(views.TicketControlView())

    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        print(f"[+] Synced {len(synced)} slash commands.")
    except Exception as e:
        print(f"[-] Failed to sync commands: {e}")

    status_text = config.get("status_text", "Managing Tickets | /setup-tickets")
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name=status_text))
    print(f"[+] Bot logged in as {bot.user} (ID: {bot.user.id})")
    print("[+] Ticket & Channel Engine is fully operational.")

# ==================== TICKET SLASH COMMANDS ====================

@bot.tree.command(name="setup-tickets", description="Deploy the interactive ticket creation panel in this channel.")
@app_commands.describe(
    title="Panel embed title",
    description="Panel embed description message",
    color_hex="Embed color in hex (e.g. #5865F2)"
)
@app_commands.checks.has_permissions(administrator=True)
async def setup_tickets(
    interaction: discord.Interaction,
    title: str = "🎫 Support & Ticket Station",
    description: str = "Need assistance, have a billing question, or found a bug?\nSelect an option from the menu below to open a private ticket.",
    color_hex: str = "#5865F2"
):
    try:
        clean_hex = color_hex.lstrip("#")
        embed_color = int(clean_hex, 16)
    except ValueError:
        embed_color = 0x5865F2

    embed = discord.Embed(
        title=title,
        description=description,
        color=embed_color
    )
    embed.add_field(
        name="⚡ What happens when you open a ticket?",
        value="A private channel will be automatically created between you and the server staff team. No other members will see your discussion.",
        inline=False
    )
    embed.set_footer(text=f"{interaction.guild.name} Support System &bull; Powered by Onyx", icon_url=interaction.guild.icon.url if interaction.guild.icon else None)

    launcher_view = views.TicketLauncherView()
    await interaction.channel.send(embed=embed, view=launcher_view)
    await interaction.response.send_message("✅ Ticket panel successfully deployed!", ephemeral=True)


ticket_group = app_commands.Group(name="ticket", description="Commands for managing tickets")

@ticket_group.command(name="close", description="Close the current ticket channel.")
@app_commands.describe(reason="Reason for closing the ticket")
async def ticket_close(interaction: discord.Interaction, reason: str = "Resolved by staff"):
    ticket = database.get_ticket_by_channel(interaction.channel.id)
    if not ticket:
        await interaction.response.send_message("❌ This channel is not recognized as an active ticket.", ephemeral=True)
        return

    await interaction.response.send_message("🔒 Initiating ticket closure and transcript export...")
    await views.execute_ticket_closure(interaction.channel, interaction.user, reason)

@ticket_group.command(name="claim", description="Claim ownership of the current ticket.")
async def ticket_claim(interaction: discord.Interaction):
    ticket = database.get_ticket_by_channel(interaction.channel.id)
    if not ticket:
        await interaction.response.send_message("❌ This channel is not an active ticket.", ephemeral=True)
        return

    if ticket.get("claimer_id"):
        if ticket["claimer_id"] == interaction.user.id:
            database.unclaim_ticket(interaction.channel.id)
            await interaction.response.send_message(f"🔓 {interaction.user.mention} unclaimed this ticket.")
            return
        else:
            await interaction.response.send_message(f"⚠️ This ticket is already claimed by <@{ticket['claimer_id']}>.", ephemeral=True)
            return

    database.claim_ticket(interaction.channel.id, interaction.user.id, str(interaction.user))
    embed = discord.Embed(
        title="👤 Ticket Claimed",
        description=f"This ticket has been claimed by {interaction.user.mention}.",
        color=discord.Color.green()
    )
    await interaction.response.send_message(embed=embed)

@ticket_group.command(name="transcript", description="Generate and export the HTML and TXT transcript.")
async def ticket_transcript(interaction: discord.Interaction):
    await interaction.response.defer(thinking=True)
    ticket = database.get_ticket_by_channel(interaction.channel.id)
    html_file, txt_file = await generate_transcript(interaction.channel, ticket)

    files = [
        discord.File(html_file, filename=os.path.basename(html_file)),
        discord.File(txt_file, filename=os.path.basename(txt_file))
    ]
    await interaction.followup.send("📄 **Generated Ticket Transcripts:**", files=files)

@ticket_group.command(name="add", description="Add a member to this ticket.")
@app_commands.describe(member="Member to add")
async def ticket_add(interaction: discord.Interaction, member: discord.Member):
    await interaction.channel.set_permissions(member, view_channel=True, send_messages=True, read_message_history=True)
    await interaction.response.send_message(f"✅ Added {member.mention} to this ticket.")

@ticket_group.command(name="remove", description="Remove a member from this ticket.")
@app_commands.describe(member="Member to remove")
async def ticket_remove(interaction: discord.Interaction, member: discord.Member):
    ticket = database.get_ticket_by_channel(interaction.channel.id)
    if ticket and ticket.get("author_id") == member.id:
        await interaction.response.send_message("❌ You cannot remove the creator of this ticket.", ephemeral=True)
        return

    await interaction.channel.set_permissions(member, overwrite=None)
    await interaction.response.send_message(f"✅ Removed {member.mention} from this ticket.")

@ticket_group.command(name="rename", description="Rename the current ticket channel.")
@app_commands.describe(new_name="New channel name")
async def ticket_rename(interaction: discord.Interaction, new_name: str):
    old_name = interaction.channel.name
    await interaction.channel.edit(name=new_name)
    await interaction.response.send_message(f"📝 Channel renamed from #{old_name} to #{new_name}.")

@ticket_group.command(name="stats", description="View server ticket statistics.")
async def ticket_stats(interaction: discord.Interaction):
    stats = database.get_stats(interaction.guild.id)
    embed = discord.Embed(
        title=f"📊 Ticket Statistics &bull; {interaction.guild.name}",
        color=discord.Color.blue()
    )
    embed.add_field(name="📂 Total Tickets", value=str(stats["total"]), inline=True)
    embed.add_field(name="🟢 Open Tickets", value=str(stats["open"]), inline=True)
    embed.add_field(name="🔴 Closed Tickets", value=str(stats["closed"]), inline=True)
    embed.add_field(name="👤 Claimed Tickets", value=str(stats["claimed"]), inline=True)
    embed.set_footer(text="Onyx Ticket Analytics")
    await interaction.response.send_message(embed=embed)

@ticket_group.command(name="set-staff", description="Configure the support staff role.")
@app_commands.describe(role="Staff role allowed to access and manage tickets")
@app_commands.checks.has_permissions(administrator=True)
async def ticket_set_staff(interaction: discord.Interaction, role: discord.Role):
    cfg = load_config()
    cfg["staff_role_id"] = role.id
    save_config(cfg)
    await interaction.response.send_message(f"✅ Staff role updated to {role.mention} ({role.id}).", ephemeral=True)

@ticket_group.command(name="set-transcripts", description="Configure the transcript logging channel.")
@app_commands.describe(channel="Channel where closed ticket transcripts will be posted")
@app_commands.checks.has_permissions(administrator=True)
async def ticket_set_transcripts(interaction: discord.Interaction, channel: discord.TextChannel):
    cfg = load_config()
    cfg["transcript_channel_id"] = channel.id
    save_config(cfg)
    await interaction.response.send_message(f"✅ Transcript logs channel set to {channel.mention}.", ephemeral=True)

bot.tree.add_command(ticket_group)

# ==================== CHANNEL MANAGEMENT SLASH COMMANDS ====================

channel_group = app_commands.Group(name="channel", description="Commands for managing server channels")

@channel_group.command(name="create", description="Create a new text or voice channel with custom options.")
@app_commands.describe(
    name="Channel name",
    channel_type="text or voice",
    category="Category to place channel under",
    private="Make channel private (only admins and staff)"
)
@app_commands.checks.has_permissions(manage_channels=True)
async def channel_create(
    interaction: discord.Interaction,
    name: str,
    channel_type: str = "text",
    category: discord.CategoryChannel = None,
    private: bool = False
):
    guild = interaction.guild
    overwrites = {}
    if private:
        overwrites[guild.default_role] = discord.PermissionOverwrite(view_channel=False)
        overwrites[interaction.user] = discord.PermissionOverwrite(view_channel=True, send_messages=True)

    if channel_type.lower() == "voice":
        new_ch = await guild.create_voice_channel(name=name, category=category, overwrites=overwrites)
        msg = f"🔊 Voice channel created: {new_ch.mention}"
    else:
        new_ch = await guild.create_text_channel(name=name, category=category, overwrites=overwrites)
        msg = f"💬 Text channel created: {new_ch.mention}"

    await interaction.response.send_message(msg)

@channel_group.command(name="delete", description="Delete a channel.")
@app_commands.describe(channel="Channel to delete (defaults to current channel)")
@app_commands.checks.has_permissions(manage_channels=True)
async def channel_delete(interaction: discord.Interaction, channel: discord.abc.GuildChannel = None):
    target = channel or interaction.channel
    ch_name = target.name
    await interaction.response.send_message(f"🗑️ Deleting channel #{ch_name} in 3 seconds...")
    await asyncio.sleep(3)
    await target.delete(reason=f"Deleted by {interaction.user.name}")

@channel_group.command(name="purge", description="Bulk delete messages in the current channel.")
@app_commands.describe(amount="Number of messages to delete (1-100)")
@app_commands.checks.has_permissions(manage_messages=True)
async def channel_purge(interaction: discord.Interaction, amount: int = 10):
    if amount < 1 or amount > 100:
        await interaction.response.send_message("❌ Amount must be between 1 and 100.", ephemeral=True)
        return

    await interaction.response.defer(ephemeral=True)
    deleted = await interaction.channel.purge(limit=amount)
    await interaction.followup.send(f"🧹 Successfully cleared {len(deleted)} messages.", ephemeral=True)

@channel_group.command(name="lock", description="Lock this channel so standard members cannot send messages.")
@app_commands.describe(channel="Channel to lock (default current)")
@app_commands.checks.has_permissions(manage_channels=True)
async def channel_lock(interaction: discord.Interaction, channel: discord.TextChannel = None):
    target = channel or interaction.channel
    overwrite = target.overwrites_for(interaction.guild.default_role)
    overwrite.send_messages = False
    await target.set_permissions(interaction.guild.default_role, overwrite=overwrite)
    await interaction.response.send_message(f"🔒 {target.mention} has been locked.")

@channel_group.command(name="unlock", description="Unlock a locked channel.")
@app_commands.describe(channel="Channel to unlock (default current)")
@app_commands.checks.has_permissions(manage_channels=True)
async def channel_unlock(interaction: discord.Interaction, channel: discord.TextChannel = None):
    target = channel or interaction.channel
    overwrite = target.overwrites_for(interaction.guild.default_role)
    overwrite.send_messages = True
    await target.set_permissions(interaction.guild.default_role, overwrite=overwrite)
    await interaction.response.send_message(f"🔓 {target.mention} has been unlocked.")

@channel_group.command(name="slowmode", description="Set message slowmode cooldown in seconds.")
@app_commands.describe(seconds="Slowmode in seconds (0 to disable, max 21600)")
@app_commands.checks.has_permissions(manage_channels=True)
async def channel_slowmode(interaction: discord.Interaction, seconds: int):
    if seconds < 0 or seconds > 21600:
        await interaction.response.send_message("❌ Slowmode must be between 0 and 21600 seconds.", ephemeral=True)
        return

    await interaction.channel.edit(slowmode_delay=seconds)
    if seconds == 0:
        await interaction.response.send_message("⚡ Slowmode disabled for this channel.")
    else:
        await interaction.response.send_message(f"⏱️ Slowmode set to {seconds} seconds.")

@channel_group.command(name="clone", description="Clone a channel with matching permissions.")
@app_commands.describe(channel="Channel to clone (default current)")
@app_commands.checks.has_permissions(manage_channels=True)
async def channel_clone(interaction: discord.Interaction, channel: discord.abc.GuildChannel = None):
    target = channel or interaction.channel
    cloned = await target.clone(name=f"{target.name}-clone", reason=f"Cloned by {interaction.user.name}")
    await interaction.response.send_message(f"📋 Channel cloned successfully: {cloned.mention}")

bot.tree.add_command(channel_group)

# ==================== ERROR HANDLING ====================

@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    if isinstance(error, app_commands.MissingPermissions):
        msg = "❌ You don't have required permissions to use this command."
    elif isinstance(error, app_commands.BotMissingPermissions):
        msg = "❌ The bot lacks required permissions (e.g. Manage Channels, Manage Roles)."
    else:
        msg = f"⚠️ An error occurred: {error}"

    if interaction.response.is_done():
        await interaction.followup.send(msg, ephemeral=True)
    else:
        await interaction.response.send_message(msg, ephemeral=True)

def main():
    cfg = load_config()
    token = cfg.get("token", "").strip()
    if not token or token == "YOUR_BOT_TOKEN_HERE":
        print("[!] ERROR: Please set your bot token in config.json or via the Onyx GUI Dashboard.")
        print("[!] Opening config.json location: " + os.path.abspath("config.json"))
        sys.exit(1)

    print("[*] Starting Onyx Ticket Bot...")
    bot.run(token)

if __name__ == "__main__":
    main()
