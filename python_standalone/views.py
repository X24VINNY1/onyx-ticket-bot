import discord
from discord import ui
import asyncio
import json
import os
import database
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

class TicketReasonModal(ui.Modal, title="Open Support Ticket"):
    def __init__(self, category_id: str, category_name: str):
        super().__init__(timeout=None)
        self.category_id = category_id
        self.category_name = category_name

        self.topic_input = ui.TextInput(
            label="Topic / Brief Summary",
            placeholder="e.g. Need assistance with server ranks / billing",
            required=True,
            max_length=100
        )
        self.add_item(self.topic_input)

        self.details_input = ui.TextInput(
            label="Detailed Description",
            style=discord.TextStyle.paragraph,
            placeholder="Explain what you need in detail so staff can assist faster...",
            required=True,
            max_length=1000
        )
        self.add_item(self.details_input)

        self.priority_input = ui.TextInput(
            label="Priority (Low / Normal / High / Urgent)",
            placeholder="Normal",
            default="Normal",
            required=False,
            max_length=20
        )
        self.add_item(self.priority_input)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        guild = interaction.guild
        user = interaction.user
        cfg = load_config()

        cat_name = cfg.get("ticket_category_name", "🎫 TICKETS")
        category = discord.utils.get(guild.categories, name=cat_name)
        if not category:
            try:
                category = await guild.create_category(cat_name)
            except discord.Forbidden:
                category = None

        ticket_num = cfg.get("ticket_counter", 1)
        cfg["ticket_counter"] = ticket_num + 1
        save_config(cfg)

        formatted_num = f"{ticket_num:04d}"
        channel_name = f"ticket-{formatted_num}-{self.category_id}"

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            user: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                attach_files=True,
                embed_links=True,
                read_message_history=True
            ),
            guild.me: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                manage_channels=True,
                manage_messages=True,
                attach_files=True,
                embed_links=True,
                read_message_history=True
            )
        }

        staff_role_id = cfg.get("staff_role_id", 0)
        staff_role = guild.get_role(staff_role_id) if staff_role_id else None
        if staff_role:
            overwrites[staff_role] = discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                manage_messages=True,
                read_message_history=True
            )

        try:
            ticket_channel = await guild.create_text_channel(
                name=channel_name,
                category=category,
                overwrites=overwrites,
                topic=f"Ticket #{formatted_num} | Created by {user.name} ({user.id}) | Category: {self.category_name}"
            )
        except Exception as e:
            await interaction.followup.send(f"❌ Failed to create channel: {e}", ephemeral=True)
            return

        priority_str = self.priority_input.value.strip().capitalize() or "Normal"

        database.create_ticket(
            ticket_num=ticket_num,
            channel_id=ticket_channel.id,
            guild_id=guild.id,
            author_id=user.id,
            author_name=str(user),
            category=self.category_name,
            topic=f"{self.topic_input.value} - {self.details_input.value}",
            priority=priority_str
        )

        embed = discord.Embed(
            title=f"🎫 Ticket #{formatted_num} &bull; {self.category_name}",
            description=f"Welcome {user.mention}! Support staff has been notified and will assist you shortly.\nUse the control buttons below to manage this ticket.",
            color=cfg.get("embed_color", 0x5865f2)
        )
        embed.add_field(name="📌 Topic", value=self.topic_input.value, inline=False)
        embed.add_field(name="📝 Details", value=self.details_input.value, inline=False)
        embed.add_field(name="⚡ Priority", value=priority_str, inline=True)
        embed.add_field(name="👤 Opened By", value=f"{user.mention} ({user.id})", inline=True)
        embed.set_footer(text="Zen2K Ticket System • Made by officialZen2K &bull; Select an action below")

        ping_msg = f"{user.mention}"
        if staff_role:
            ping_msg += f" | {staff_role.mention}"

        await ticket_channel.send(content=ping_msg, embed=embed, view=TicketControlView())

        await interaction.followup.send(
            f"✅ Your ticket has been created: {ticket_channel.mention}",
            ephemeral=True
        )


class TicketLauncherView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.update_select()

    def update_select(self):
        self.clear_items()
        cfg = load_config()
        categories = cfg.get("categories", [
            {"id": "general", "label": "General Support", "description": "General inquiries & assistance", "emoji": "❓"},
            {"id": "billing", "label": "Billing & Purchases", "description": "Payments & orders", "emoji": "💳"},
            {"id": "bug", "label": "Bug Report", "description": "Defects & glitch reporting", "emoji": "🐛"}
        ])

        options = []
        for c in categories:
            emoji = c.get("emoji") or "🎫"
            options.append(discord.SelectOption(
                label=c.get("label", "Support"),
                value=c.get("id", "general"),
                description=c.get("description", "")[:100],
                emoji=emoji
            ))

        select = ui.Select(
            placeholder="👉 Select a ticket category to open a ticket...",
            options=options,
            custom_id="onyx:ticket_select_category",
            min_values=1,
            max_values=1
        )
        select.callback = self.on_select_category
        self.add_item(select)

    async def on_select_category(self, interaction: discord.Interaction):
        selected_id = interaction.data["values"][0]
        cfg = load_config()
        cat_info = next((c for c in cfg.get("categories", []) if c["id"] == selected_id), None)
        cat_label = cat_info["label"] if cat_info else selected_id.capitalize()

        modal = TicketReasonModal(category_id=selected_id, category_name=cat_label)
        await interaction.response.send_modal(modal)


class CloseReasonModal(ui.Modal, title="Close Ticket"):
    def __init__(self, channel: discord.TextChannel):
        super().__init__(timeout=None)
        self.channel = channel
        self.reason_input = ui.TextInput(
            label="Reason for closing",
            placeholder="e.g. Issue resolved / User request",
            required=False,
            default="Issue resolved"
        )
        self.add_item(self.reason_input)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=False)
        reason = self.reason_input.value or "Issue resolved"
        await execute_ticket_closure(self.channel, interaction.user, reason)


class AddMemberModal(ui.Modal, title="Add Member to Ticket"):
    def __init__(self, channel: discord.TextChannel):
        super().__init__(timeout=None)
        self.channel = channel
        self.user_id_input = ui.TextInput(
            label="User ID or Username",
            placeholder="Paste member ID (e.g. 123456789012345678)",
            required=True
        )
        self.add_item(self.user_id_input)

    async def on_submit(self, interaction: discord.Interaction):
        raw_val = self.user_id_input.value.strip()
        guild = interaction.guild
        member = None
        if raw_val.isdigit():
            member = guild.get_member(int(raw_val))
        if not member:
            member = discord.utils.get(guild.members, name=raw_val)

        if not member:
            await interaction.response.send_message(f"❌ Could not find member {raw_val}.", ephemeral=True)
            return

        await self.channel.set_permissions(member, view_channel=True, send_messages=True, read_message_history=True)
        await interaction.response.send_message(f"✅ Added {member.mention} to this ticket.", ephemeral=False)


class TicketControlView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @ui.button(label="Close", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="onyx:btn_close")
    async def close_btn(self, interaction: discord.Interaction, button: ui.Button):
        confirm_view = TicketConfirmCloseView(interaction.channel)
        await interaction.response.send_message(
            "⚠️ **Are you sure you want to close this ticket?**",
            view=confirm_view,
            ephemeral=False
        )

    @ui.button(label="Close with Reason", style=discord.ButtonStyle.secondary, emoji="🛑", custom_id="onyx:btn_close_reason")
    async def close_reason_btn(self, interaction: discord.Interaction, button: ui.Button):
        modal = CloseReasonModal(interaction.channel)
        await interaction.response.send_modal(modal)

    @ui.button(label="Claim", style=discord.ButtonStyle.success, emoji="👤", custom_id="onyx:btn_claim")
    async def claim_btn(self, interaction: discord.Interaction, button: ui.Button):
        ticket = database.get_ticket_by_channel(interaction.channel.id)
        if not ticket:
            await interaction.response.send_message("❌ This channel is not registered as an active ticket.", ephemeral=True)
            return

        if ticket.get("claimer_id"):
            if ticket["claimer_id"] == interaction.user.id:
                database.unclaim_ticket(interaction.channel.id)
                await interaction.response.send_message(f"🔓 {interaction.user.mention} unclaimed this ticket.", ephemeral=False)
                return
            else:
                await interaction.response.send_message(f"⚠️ This ticket is already claimed by <@{ticket['claimer_id']}>.", ephemeral=True)
                return

        database.claim_ticket(interaction.channel.id, interaction.user.id, str(interaction.user))
        embed = discord.Embed(
            title="👤 Ticket Claimed",
            description=f"This ticket has been claimed by {interaction.user.mention}.\nThey will be handling your request from here.",
            color=discord.Color.green()
        )
        await interaction.response.send_message(embed=embed)

    @ui.button(label="Transcript", style=discord.ButtonStyle.primary, emoji="📑", custom_id="onyx:btn_transcript")
    async def transcript_btn(self, interaction: discord.Interaction, button: ui.Button):
        await interaction.response.defer(ephemeral=False, thinking=True)
        ticket = database.get_ticket_by_channel(interaction.channel.id)
        html_file, txt_file = await generate_transcript(interaction.channel, ticket)

        files = [
            discord.File(html_file, filename=os.path.basename(html_file)),
            discord.File(txt_file, filename=os.path.basename(txt_file))
        ]
        await interaction.followup.send("📄 **Generated Ticket Transcripts (HTML & TXT):**", files=files)

    @ui.button(label="Add Member", style=discord.ButtonStyle.secondary, emoji="➕", custom_id="onyx:btn_add_member")
    async def add_member_btn(self, interaction: discord.Interaction, button: ui.Button):
        modal = AddMemberModal(interaction.channel)
        await interaction.response.send_modal(modal)


class TicketConfirmCloseView(ui.View):
    def __init__(self, channel: discord.TextChannel):
        super().__init__(timeout=60)
        self.channel = channel

    @ui.button(label="Confirm Close", style=discord.ButtonStyle.danger, emoji="✅")
    async def confirm(self, interaction: discord.Interaction, button: ui.Button):
        self.stop()
        await interaction.response.send_message("🔒 Closing ticket and generating transcript...", ephemeral=False)
        await execute_ticket_closure(self.channel, interaction.user, "Closed by user confirmation")

    @ui.button(label="Cancel", style=discord.ButtonStyle.secondary, emoji="❌")
    async def cancel(self, interaction: discord.Interaction, button: ui.Button):
        self.stop()
        await interaction.message.delete()


async def execute_ticket_closure(channel: discord.TextChannel, closed_by: discord.Member, reason: str):
    ticket = database.get_ticket_by_channel(channel.id)
    cfg = load_config()

    try:
        html_file, txt_file = await generate_transcript(channel, ticket)
    except Exception as e:
        html_file, txt_file = None, None

    database.close_ticket(channel.id, closed_by.id, str(closed_by), reason)

    author = None
    if ticket:
        author = channel.guild.get_member(ticket["author_id"])

    dm_embed = discord.Embed(
        title=f"🔒 Ticket Closed &bull; #{channel.name}",
        description=f"Your ticket in **{channel.guild.name}** has been closed.\n**Reason:** {reason}\n**Closed by:** {closed_by.name}",
        color=discord.Color.red()
    )
    if author:
        try:
            files_to_send = []
            if html_file and os.path.exists(html_file):
                files_to_send.append(discord.File(html_file, filename=os.path.basename(html_file)))
            await author.send(embed=dm_embed, files=files_to_send)
        except Exception:
            pass

    trans_channel_id = cfg.get("transcript_channel_id", 0)
    if trans_channel_id:
        trans_channel = channel.guild.get_channel(trans_channel_id)
        if trans_channel:
            log_embed = discord.Embed(
                title=f"📁 Archived Ticket: #{channel.name}",
                description=f"**Category:** {ticket.get('category', 'Support') if ticket else 'N/A'}\n"
                            f"**Opened by:** <@{ticket.get('author_id')}> ({ticket.get('author_name')})\n"
                            f"**Closed by:** {closed_by.mention} ({closed_by.name})\n"
                            f"**Reason:** {reason}",
                color=discord.Color.dark_grey()
            )
            files_to_send = []
            if html_file and os.path.exists(html_file):
                files_to_send.append(discord.File(html_file, filename=os.path.basename(html_file)))
            if txt_file and os.path.exists(txt_file):
                files_to_send.append(discord.File(txt_file, filename=os.path.basename(txt_file)))
            try:
                await trans_channel.send(embed=log_embed, files=files_to_send)
            except Exception:
                pass

    await channel.send("⏳ *This channel will be deleted in 5 seconds...*")
    await asyncio.sleep(5)
    try:
        await channel.delete(reason=f"Ticket closed by {closed_by.name}: {reason}")
    except Exception:
        pass
