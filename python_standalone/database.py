import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "tickets.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_num INTEGER NOT NULL,
            channel_id INTEGER UNIQUE,
            guild_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            category TEXT NOT NULL,
            topic TEXT,
            priority TEXT DEFAULT 'Normal',
            status TEXT DEFAULT 'open',
            claimer_id INTEGER,
            claimer_name TEXT,
            closed_by_id INTEGER,
            closed_by_name TEXT,
            close_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    conn.commit()
    conn.close()

def create_ticket(ticket_num, channel_id, guild_id, author_id, author_name, category, topic="No details provided", priority="Normal"):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO tickets (ticket_num, channel_id, guild_id, author_id, author_name, category, topic, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    ''', (ticket_num, channel_id, guild_id, author_id, author_name, category, topic, priority, datetime.utcnow()))
    conn.commit()
    ticket_id = c.lastrowid
    conn.close()
    return ticket_id

def get_ticket_by_channel(channel_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM tickets WHERE channel_id = ?", (channel_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_ticket_by_num(ticket_num):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM tickets WHERE ticket_num = ?", (ticket_num,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def close_ticket(channel_id, closed_by_id, closed_by_name, reason="No reason specified"):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE tickets
        SET status = 'closed',
            closed_by_id = ?,
            closed_by_name = ?,
            close_reason = ?,
            closed_at = ?
        WHERE channel_id = ?
    ''', (closed_by_id, closed_by_name, reason, datetime.utcnow(), channel_id))
    conn.commit()
    conn.close()

def claim_ticket(channel_id, claimer_id, claimer_name):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE tickets
        SET claimer_id = ?, claimer_name = ?
        WHERE channel_id = ?
    ''', (claimer_id, claimer_name, channel_id))
    conn.commit()
    conn.close()

def unclaim_ticket(channel_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE tickets
        SET claimer_id = NULL, claimer_name = NULL
        WHERE channel_id = ?
    ''', (channel_id,))
    conn.commit()
    conn.close()

def get_open_tickets(guild_id=None):
    conn = get_connection()
    c = conn.cursor()
    if guild_id:
        c.execute("SELECT * FROM tickets WHERE status = 'open' AND guild_id = ? ORDER BY id DESC", (guild_id,))
    else:
        c.execute("SELECT * FROM tickets WHERE status = 'open' ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all_tickets(limit=100):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM tickets ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_stats(guild_id=None):
    conn = get_connection()
    c = conn.cursor()
    if guild_id:
        c.execute("SELECT COUNT(*) FROM tickets WHERE guild_id = ?", (guild_id,))
        total = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM tickets WHERE guild_id = ? AND status = 'open'", (guild_id,))
        open_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM tickets WHERE guild_id = ? AND status = 'closed'", (guild_id,))
        closed_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM tickets WHERE guild_id = ? AND claimer_id IS NOT NULL AND status = 'open'", (guild_id,))
        claimed_count = c.fetchone()[0]
    else:
        c.execute("SELECT COUNT(*) FROM tickets")
        total = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM tickets WHERE status = 'open'")
        open_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM tickets WHERE status = 'closed'")
        closed_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM tickets WHERE claimer_id IS NOT NULL AND status = 'open'")
        claimed_count = c.fetchone()[0]
    conn.close()
    return {
        "total": total,
        "open": open_count,
        "closed": closed_count,
        "claimed": claimed_count
    }

init_db()
