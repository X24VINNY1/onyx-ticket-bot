import os
import html
from datetime import datetime
import discord

TRANSCRIPT_DIR = os.path.join(os.path.dirname(__file__), "transcripts")
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - {ticket_title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #313338;
            color: #dbdee1;
            font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.375rem;
            padding: 24px 16px;
        }
        .header {
            background-color: #2b2d31;
            border-left: 4px solid #5865f2;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        .header h1 {
            color: #f2f3f5;
            font-size: 22px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .header-meta {
            color: #949ba4;
            font-size: 13px;
            line-height: 1.6;
        }
        .header-meta strong { color: #dbdee1; }
        .chat-container {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .message-group {
            display: flex;
            gap: 16px;
            padding: 8px 12px;
            border-radius: 6px;
            transition: background 0.15s ease;
        }
        .message-group:hover {
            background-color: #2e3035;
        }
        .avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            flex-shrink: 0;
            background-color: #5865f2;
        }
        .message-content {
            flex-grow: 1;
            overflow-wrap: break-word;
            min-width: 0;
        }
        .author-line {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 4px;
        }
        .author-name {
            font-weight: 600;
            color: #f2f3f5;
            font-size: 15px;
        }
        .bot-badge {
            background-color: #5865f2;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 3px;
            text-transform: uppercase;
        }
        .timestamp {
            color: #949ba4;
            font-size: 11px;
        }
        .text {
            color: #dbdee1;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .code-block {
            background-color: #1e1f22;
            border: 1px solid #232428;
            padding: 10px 12px;
            border-radius: 6px;
            font-family: Consolas, "Courier New", monospace;
            font-size: 13px;
            margin-top: 6px;
            overflow-x: auto;
            color: #f2f3f5;
        }
        .attachments {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }
        .attachment-img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 6px;
            border: 1px solid #2b2d31;
        }
        .attachment-file {
            background-color: #2b2d31;
            padding: 8px 12px;
            border-radius: 6px;
            color: #00a8fc;
            text-decoration: none;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .embed {
            background-color: #2b2d31;
            border-left: 4px solid #5865f2;
            border-radius: 4px;
            padding: 12px 16px;
            margin-top: 8px;
            max-width: 540px;
        }
        .embed-title {
            font-weight: 700;
            color: #f2f3f5;
            margin-bottom: 6px;
            font-size: 15px;
        }
        .embed-description {
            color: #dbdee1;
            font-size: 14px;
            margin-bottom: 8px;
            white-space: pre-wrap;
        }
        .embed-field {
            margin-top: 6px;
        }
        .embed-field-name {
            font-weight: 600;
            font-size: 13px;
            color: #f2f3f5;
        }
        .embed-field-value {
            font-size: 13px;
            color: #dbdee1;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #949ba4;
            font-size: 12px;
            border-top: 1px solid #3f4147;
            padding-top: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 Transcript: {ticket_title}</h1>
        <div class="header-meta">
            <strong>Channel:</strong> #{channel_name} (ID: {channel_id})<br>
            <strong>Ticket ID:</strong> #{ticket_num} | <strong>Category:</strong> {category}<br>
            <strong>Created by:</strong> {author_name} ({author_id})<br>
            <strong>Exported on:</strong> {export_time} | <strong>Total Messages:</strong> {msg_count}
        </div>
    </div>

    <div class="chat-container">
        {messages_html}
    </div>

    <div class="footer">
        Generated by Onyx Ticket Engine &bull; Total Messages Recorded: {msg_count}
    </div>
</body>
</html>
"""

async def generate_transcript(channel: discord.TextChannel, ticket_data: dict = None) -> tuple[str, str]:
    messages = []
    async for msg in channel.history(limit=1000, oldest_first=True):
        messages.append(msg)

    ticket_num = ticket_data.get("ticket_num", "N/A") if ticket_data else "N/A"
    ticket_title = f"Ticket #{ticket_num}"
    author_name = ticket_data.get("author_name", "Unknown") if ticket_data else "Unknown"
    author_id = ticket_data.get("author_id", "Unknown") if ticket_data else "Unknown"
    category = ticket_data.get("category", "Support") if ticket_data else "Support"
    export_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    messages_html_list = []
    txt_lines = [
        f"=== TRANSCRIPT FOR #{channel.name} ===",
        f"Ticket #{ticket_num} - {category}",
        f"Creator: {author_name} ({author_id})",
        f"Exported: {export_time}",
        f"Messages: {len(messages)}",
        "=" * 50,
        ""
    ]

    for msg in messages:
        time_str = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        txt_lines.append(f"[{time_str}] {msg.author} ({msg.author.id}): {msg.content}")
        for att in msg.attachments:
            txt_lines.append(f"   [Attachment: {att.filename} -> {att.url}]")

        avatar_url = msg.author.display_avatar.url if msg.author.display_avatar else "https://cdn.discordapp.com/embed/avatars/0.png"
        safe_author = html.escape(str(msg.author))
        bot_badge_html = '<span class="bot-badge">BOT</span>' if msg.author.bot else ''
        content_escaped = html.escape(msg.clean_content)

        if "`" in content_escaped:
            parts = content_escaped.split("`")
            formatted_parts = []
            for i, p in enumerate(parts):
                if i % 2 == 1:
                    formatted_parts.append(f'<div class="code-block">{p}</div>')
                else:
                    formatted_parts.append(f'<span class="text">{p}</span>')
            content_html = "".join(formatted_parts)
        else:
            content_html = f'<span class="text">{content_escaped}</span>'

        att_html_list = []
        if msg.attachments:
            att_html_list.append('<div class="attachments">')
            for att in msg.attachments:
                lower = att.filename.lower()
                if lower.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                    att_html_list.append(f'<a href="{att.url}" target="_blank"><img class="attachment-img" src="{att.url}" alt="{html.escape(att.filename)}" /></a>')
                else:
                    att_html_list.append(f'<a class="attachment-file" href="{att.url}" target="_blank">📎 {html.escape(att.filename)}</a>')
            att_html_list.append('</div>')

        embeds_html_list = []
        for emb in msg.embeds:
            color_hex = f"#{emb.color.value:06x}" if emb.color else "#5865f2"
            title_html = f'<div class="embed-title">{html.escape(emb.title)}</div>' if emb.title else ''
            desc_html = f'<div class="embed-description">{html.escape(emb.description)}</div>' if emb.description else ''
            fields_html = []
            for field in emb.fields:
                fields_html.append(f'<div class="embed-field"><div class="embed-field-name">{html.escape(field.name)}</div><div class="embed-field-value">{html.escape(field.value)}</div></div>')
            
            embed_card = f'<div class="embed" style="border-left-color: {color_hex};">{title_html}{desc_html}{"".join(fields_html)}</div>'
            embeds_html_list.append(embed_card)

        msg_html = f"""
        <div class="message-group">
            <img class="avatar" src="{avatar_url}" alt="avatar" />
            <div class="message-content">
                <div class="author-line">
                    <span class="author-name">{safe_author}</span>
                    {bot_badge_html}
                    <span class="timestamp">{time_str} UTC</span>
                </div>
                {content_html}
                {"".join(att_html_list)}
                {"".join(embeds_html_list)}
            </div>
        </div>
        """
        messages_html_list.append(msg_html)

    final_html = HTML_TEMPLATE.format(
        ticket_title=ticket_title,
        channel_name=html.escape(channel.name),
        channel_id=channel.id,
        ticket_num=ticket_num,
        category=html.escape(category),
        author_name=html.escape(author_name),
        author_id=author_id,
        export_time=export_time,
        msg_count=len(messages),
        messages_html="\n".join(messages_html_list)
    )

    filename_base = f"transcript-{channel.name}-{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    html_file = os.path.join(TRANSCRIPT_DIR, f"{filename_base}.html")
    txt_file = os.path.join(TRANSCRIPT_DIR, f"{filename_base}.txt")

    with open(html_file, "w", encoding="utf-8") as f:
        f.write(final_html)

    with open(txt_file, "w", encoding="utf-8") as f:
        f.write("\n".join(txt_lines))

    return html_file, txt_file
