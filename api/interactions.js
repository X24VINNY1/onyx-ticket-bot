import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions';

const DISCORD_API = 'https://discord.com/api/v10';
const TICKETS_CATEGORY_ID = process.env.TICKETS_CATEGORY_ID || '1529702797082365962';
const TRANSCRIPTS_CHANNEL_ID = process.env.TRANSCRIPTS_CHANNEL_ID || '1529702818796015718';
const VOUCHES_CHANNEL_ID = process.env.VOUCHES_CHANNEL_ID || '1529699140953702400';
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID || '1529699129176100914';
const VOICE_PANEL_CHANNEL_ID = process.env.VOICE_PANEL_CHANNEL_ID || '1549599836913803284';
const JOIN_TO_CREATE_VC_ID = process.env.JOIN_TO_CREATE_VC_ID || '1549599780257144923';

async function discordFetch(endpoint, options = {}) {
  const token = process.env.DISCORD_TOKEN;
  const res = await fetch(DISCORD_API + endpoint, {
    ...options,
    headers: {
      'Authorization': 'Bot ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Discord API Error [' + endpoint + ']:', errText);
    throw new Error('Discord API error: ' + res.status + ' ' + errText);
  }
  return res.json().catch(() => ({}));
}

// 🛡️ Zen2K Anti-Troll & Blacklist Security Cache
let blacklistCache = null;
let blacklistCacheTime = 0;
let blacklistRoleIdCache = null;

function isStaff(member) {
  if (!member) return false;
  try {
    const permissions = BigInt(member.permissions || '0');
    // 0x8 = Admin, 0x20 = Manage Guild, 0x10 = Manage Channels, 0x10000000 = Manage Roles
    if ((permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n || (permissions & 0x10n) === 0x10n || (permissions & 0x10000000n) === 0x10000000n) return true;
  } catch (_) {}
  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (staffRoleId && member.roles && member.roles.includes(staffRoleId)) return true;
  return false;
}

function parseColorHex(input) {
  if (!input) return 0;
  const named = {
    gold: 0xFEE75C,
    yellow: 0xFEE75C,
    green: 0x57F287,
    emerald: 0x00FFA3,
    teal: 0x1ABC9C,
    blue: 0x5865F2,
    blurple: 0x5865F2,
    red: 0xED4245,
    purple: 0x9B59B6,
    pink: 0xEB459E,
    orange: 0xE67E22,
    white: 0xFFFFFF,
    black: 0x23272A,
    cyan: 0x00E5FF
  };
  const clean = input.toLowerCase().trim().replace('#', '');
  if (named[clean]) return named[clean];
  const parsed = parseInt(clean, 16);
  return isNaN(parsed) ? 0 : parsed;
}

const PERM_FLAGS = {
  administrator: 0x8n,
  admin: 0x8n,
  manage_guild: 0x20n,
  manage_channels: 0x10n,
  kick_members: 0x2n,
  kick: 0x2n,
  ban_members: 0x4n,
  ban: 0x4n,
  manage_messages: 0x2000n,
  mute_members: 0x400000n,
  deafen_members: 0x800000n,
  move_members: 0x1000000n,
  manage_nicknames: 0x8000000n,
  manage_roles: 0x10000000n,
  view_audit_log: 0x80n,
  view_channel: 0x400n,
  send_messages: 0x800n,
  embed_links: 0x4000n,
  attach_files: 0x8000n,
  read_message_history: 0x10000n,
  mention_everyone: 0x20000n,
  use_external_emojis: 0x40000n,
  connect: 0x100000n,
  speak: 0x200000n,
  moderate_members: 0x10000000000n,
  timeout: 0x10000000000n
};

function resolvePermissions(input) {
  if (!input) return { bits: '0', label: 'None (0)', list: ['No extra permissions'] };
  const lower = input.toLowerCase().trim();

  if (lower === 'admin' || lower === 'administrator') {
    return {
      bits: '8',
      label: '👑 Administrator (Full Control)',
      list: ['Full Administrator Privileges (All Permissions Granted)']
    };
  }

  if (lower === 'mod' || lower === 'moderator') {
    const bits = PERM_FLAGS.view_channel | PERM_FLAGS.send_messages | PERM_FLAGS.read_message_history |
      PERM_FLAGS.embed_links | PERM_FLAGS.attach_files | PERM_FLAGS.kick_members | PERM_FLAGS.ban_members |
      PERM_FLAGS.manage_messages | PERM_FLAGS.mute_members | PERM_FLAGS.deafen_members | PERM_FLAGS.manage_nicknames |
      PERM_FLAGS.view_audit_log | PERM_FLAGS.moderate_members;
    return {
      bits: bits.toString(),
      label: '🛡️ Moderator (Full Moderation Suite)',
      list: ['Kick & Ban Members', 'Timeout/Mute', 'Manage & Delete Messages', 'Manage Nicknames', 'View Audit Log', 'Voice Mute & Deafen']
    };
  }

  if (lower === 'support' || lower === 'staff') {
    const bits = PERM_FLAGS.view_channel | PERM_FLAGS.send_messages | PERM_FLAGS.read_message_history |
      PERM_FLAGS.embed_links | PERM_FLAGS.attach_files | PERM_FLAGS.manage_messages | PERM_FLAGS.manage_nicknames;
    return {
      bits: bits.toString(),
      label: '⚡ Support Staff (Ticket & Chat Management)',
      list: ['View Channels & History', 'Send Messages & Attach Files', 'Manage & Clean Messages', 'Manage Nicknames']
    };
  }

  if (lower === 'member' || lower === 'customer') {
    const bits = PERM_FLAGS.view_channel | PERM_FLAGS.send_messages | PERM_FLAGS.read_message_history |
      PERM_FLAGS.embed_links | PERM_FLAGS.attach_files | PERM_FLAGS.connect | PERM_FLAGS.speak | PERM_FLAGS.use_external_emojis;
    return {
      bits: bits.toString(),
      label: '👤 Customer / Verified Member (Standard Chat)',
      list: ['View Channels & Read History', 'Send Messages & Embed Links', 'Attach Files', 'Voice Connect & Speak']
    };
  }

  if (lower === 'readonly') {
    const bits = PERM_FLAGS.view_channel | PERM_FLAGS.read_message_history;
    return {
      bits: bits.toString(),
      label: '👁️ Read Only (View Only, Chat Disabled)',
      list: ['View Channels', 'Read Message History']
    };
  }

  if (lower === 'none') {
    return {
      bits: '0',
      label: '⛔ None (0 Permissions)',
      list: ['Default / No Server Permissions']
    };
  }

  let combined = 0n;
  const list = [];
  const parts = lower.split(/[,;\s]+/);
  for (const p of parts) {
    if (PERM_FLAGS[p]) {
      combined |= PERM_FLAGS[p];
      list.push(p);
    }
  }

  return {
    bits: combined.toString(),
    label: '⚙️ Custom Permissions (' + list.length + ' active)',
    list: list.length > 0 ? list : ['None']
  };
}

async function getBlacklistDb() {
  if (blacklistCache && (Date.now() - blacklistCacheTime < 30000)) {
    return blacklistCache;
  }
  try {
    const msgs = await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages?limit=50').catch(() => []);
    if (Array.isArray(msgs)) {
      const dbMsg = msgs.find(m => m.content && m.content.includes('ZEN2K_SECURITY_BLACKLIST_DB'));
      if (dbMsg) {
        const jsonMatch = dbMsg.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          blacklistCache = JSON.parse(jsonMatch[1]);
          blacklistCacheTime = Date.now();
          return blacklistCache;
        }
      }
    }
  } catch (err) {
    console.error('Error reading blacklist DB:', err);
  }
  blacklistCache = {};
  blacklistCacheTime = Date.now();
  return blacklistCache;
}

async function saveBlacklistDb(db) {
  blacklistCache = db;
  blacklistCacheTime = Date.now();
  const dbText = '🔒 **ZEN2K_SECURITY_BLACKLIST_DB** (Do Not Delete)\n```json\n' + JSON.stringify(db, null, 2) + '\n```';
  try {
    const msgs = await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages?limit=50').catch(() => []);
    const existing = Array.isArray(msgs) ? msgs.find(m => m.content && m.content.includes('ZEN2K_SECURITY_BLACKLIST_DB')) : null;
    if (existing) {
      await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages/' + existing.id, {
        method: 'PATCH',
        body: JSON.stringify({ content: dbText })
      });
    } else {
      await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages', {
        method: 'POST',
        body: JSON.stringify({ content: dbText })
      });
    }
  } catch (err) {
    console.error('Error saving blacklist DB:', err);
  }
}

let autoroleCache = null;
let autoroleCacheTime = 0;

async function getAutoroleDb() {
  if (autoroleCache && (Date.now() - autoroleCacheTime < 30000)) {
    return autoroleCache;
  }
  try {
    const msgs = await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages?limit=50').catch(() => []);
    if (Array.isArray(msgs)) {
      const dbMsg = msgs.find(m => m.content && m.content.includes('ZEN2K_AUTOROLE_CONFIG_DB'));
      if (dbMsg) {
        const jsonMatch = dbMsg.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          autoroleCache = JSON.parse(jsonMatch[1]);
          autoroleCacheTime = Date.now();
          return autoroleCache;
        }
      }
    }
  } catch (err) {
    console.error('Error reading autorole DB:', err);
  }
  autoroleCache = { roleId: VERIFIED_ROLE_ID, enabled: true };
  autoroleCacheTime = Date.now();
  return autoroleCache;
}

async function saveAutoroleDb(db) {
  autoroleCache = db;
  autoroleCacheTime = Date.now();
  const dbText = '⚙️ **ZEN2K_AUTOROLE_CONFIG_DB** (Do Not Delete)\n```json\n' + JSON.stringify(db, null, 2) + '\n```';
  try {
    const msgs = await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages?limit=50').catch(() => []);
    const existing = Array.isArray(msgs) ? msgs.find(m => m.content && m.content.includes('ZEN2K_AUTOROLE_CONFIG_DB')) : null;
    if (existing) {
      await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages/' + existing.id, {
        method: 'PATCH',
        body: JSON.stringify({ content: dbText })
      });
    } else {
      await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages', {
        method: 'POST',
        body: JSON.stringify({ content: dbText })
      });
    }
  } catch (err) {
    console.error('Error saving autorole DB:', err);
  }
}

let voiceRoomsCache = null;
let voiceRoomsCacheTime = 0;

async function getVoiceRoomsDb() {
  if (voiceRoomsCache && (Date.now() - voiceRoomsCacheTime < 15000)) {
    return voiceRoomsCache;
  }
  try {
    const msgs = await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages?limit=50').catch(() => []);
    if (Array.isArray(msgs)) {
      const dbMsg = msgs.find(m => m.content && m.content.includes('ZEN2K_VOICE_ROOMS_DB'));
      if (dbMsg) {
        const jsonMatch = dbMsg.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          voiceRoomsCache = JSON.parse(jsonMatch[1]);
          voiceRoomsCacheTime = Date.now();
          return voiceRoomsCache;
        }
      }
    }
  } catch (err) {
    console.error('Error reading voice rooms DB:', err);
  }
  voiceRoomsCache = {};
  voiceRoomsCacheTime = Date.now();
  return voiceRoomsCache;
}

async function saveVoiceRoomsDb(db) {
  voiceRoomsCache = db;
  voiceRoomsCacheTime = Date.now();
  const dbText = '🔊 **ZEN2K_VOICE_ROOMS_DB** (Do Not Delete)\n```json\n' + JSON.stringify(db, null, 2) + '\n```';
  try {
    const msgs = await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages?limit=50').catch(() => []);
    const existing = Array.isArray(msgs) ? msgs.find(m => m.content && m.content.includes('ZEN2K_VOICE_ROOMS_DB')) : null;
    if (existing) {
      await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages/' + existing.id, {
        method: 'PATCH',
        body: JSON.stringify({ content: dbText })
      });
    } else {
      await discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages', {
        method: 'POST',
        body: JSON.stringify({ content: dbText })
      });
    }
  } catch (err) {
    console.error('Error saving voice rooms DB:', err);
  }
}

async function getUserVoiceRoom(guildId, userId, username = '') {
  const db = await getVoiceRoomsDb();
  if (db && db[userId]) {
    try {
      const ch = await discordFetch('/channels/' + db[userId]);
      if (ch && ch.id) return ch;
    } catch (_) {}
  }
  // Fallback: search guild channels for voice channel owned by user
  try {
    const channels = await discordFetch('/guilds/' + guildId + '/channels');
    if (Array.isArray(channels)) {
      const found = channels.find(c => c.type === 2 && (
        (c.permission_overwrites && c.permission_overwrites.some(p => p.id === userId && p.type === 1)) ||
        (username && c.name.toLowerCase().includes(username.toLowerCase()))
      ));
      if (found) {
        db[userId] = found.id;
        await saveVoiceRoomsDb(db);
        return found;
      }
    }
  } catch (_) {}
  return null;
}

async function resolveUserId(guildId, input) {
  if (!input) return null;
  const directId = input.replace(/[<@!>]/g, '').trim();
  if (/^\d{17,20}$/.test(directId)) return directId;
  const cleanName = input.replace(/^@/, '').trim().toLowerCase();
  try {
    const searchRes = await discordFetch('/guilds/' + guildId + '/members/search?query=' + encodeURIComponent(cleanName) + '&limit=1');
    if (Array.isArray(searchRes) && searchRes.length > 0) {
      return searchRes[0].user?.id;
    }
  } catch (_) {}
  return null;
}

function buildVoiceControlPanelPayload() {
  return {
    embeds: [{
      title: '🎛️ Zen2K Voice Room Control Center',
      description: '>>> **Welcome to the Master Voice Channel Manager!**\n\nWhen you enter the **`🔊 Join to Create`** channel (<#1549599780257144923>), your private room is generated.\n\nUse the buttons below to lock your room, mute/unmute members, adjust slots, or delete your squad channel.',
      color: 0x5865F2,
      fields: [
        {
          name: '🔒 Privacy & Management',
          value: '• **Lock / Unlock**: Toggle whether other members can join\n• **Mute / Unmute**: Silence any disruptive microphone in your room\n• **Kick / Disconnect**: Remove unwanted players from your room',
          inline: false
        },
        {
          name: '⚙️ Customization',
          value: '• **Player Limit**: Set slots for 2s (2), 3s (3), 5s (5), or unlimited (0)\n• **Rename Room**: Personalize your squad channel name\n• **Delete**: Clean up and remove channel when finished',
          inline: false
        },
        {
          name: '🚪 Join Channel',
          value: 'Click or join <#1549599780257144923> to enter your private room!',
          inline: false
        }
      ],
      footer: { text: 'Zen2K Voice Hub • Powered by officialZen2K' }
    }],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 1, custom_id: 'btn_vcp_create', label: 'Create Room', emoji: { name: '➕' } },
          { type: 2, style: 2, custom_id: 'btn_vcp_lock', label: 'Lock', emoji: { name: '🔒' } },
          { type: 2, style: 2, custom_id: 'btn_vcp_unlock', label: 'Unlock', emoji: { name: '🔓' } },
          { type: 2, style: 2, custom_id: 'btn_vcp_limit', label: 'Set Limit', emoji: { name: '👥' } },
          { type: 2, style: 2, custom_id: 'btn_vcp_rename', label: 'Rename', emoji: { name: '✏️' } }
        ]
      },
      {
        type: 1,
        components: [
          { type: 2, style: 4, custom_id: 'btn_vcp_mute', label: 'Mute User', emoji: { name: '🔇' } },
          { type: 2, style: 3, custom_id: 'btn_vcp_unmute', label: 'Unmute User', emoji: { name: '🔊' } },
          { type: 2, style: 4, custom_id: 'btn_vcp_kick', label: 'Kick User', emoji: { name: '🚫' } },
          { type: 2, style: 4, custom_id: 'btn_vcp_delete', label: 'Delete Room', emoji: { name: '🗑️' } }
        ]
      }
    ]
  };
}

async function getBlacklistRoleId(guildId) {
  if (blacklistRoleIdCache) return blacklistRoleIdCache;
  try {
    const roles = await discordFetch('/guilds/' + guildId + '/roles').catch(() => []);
    if (Array.isArray(roles)) {
      const existing = roles.find(r => r.name.toLowerCase() === 'zen2k blacklisted' || r.name.toLowerCase() === 'blacklisted');
      if (existing) {
        blacklistRoleIdCache = existing.id;
        return existing.id;
      }
    }
    const created = await discordFetch('/guilds/' + guildId + '/roles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Zen2K Blacklisted',
        color: 0xED4245,
        permissions: '0',
        mentionable: false
      })
    });
    if (created && created.id) {
      blacklistRoleIdCache = created.id;
      return created.id;
    }
  } catch (err) {
    console.error('Error resolving blacklist role:', err);
  }
  return null;
}

async function isMemberBlacklisted(guildId, member) {
  if (!member) return false;
  const userId = member.user?.id;
  if (!userId) return false;
  
  if (blacklistRoleIdCache && member.roles && member.roles.includes(blacklistRoleIdCache)) {
    return true;
  }
  const db = await getBlacklistDb();
  if (db && db[userId]) {
    return true;
  }
  return false;
}

// Upload a message with an attached downloadable .txt transcript file + fallback
async function sendDiscordMessageWithFile(channelId, payloadJson, fileContent, filename) {
  const token = process.env.DISCORD_TOKEN;
  try {
    const formData = new FormData();
    const fileBlob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    formData.append('files[0]', fileBlob, filename);
    formData.append('payload_json', JSON.stringify({
      ...payloadJson,
      attachments: [{ id: 0, filename: filename }]
    }));

    const res = await fetch(DISCORD_API + '/channels/' + channelId + '/messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bot ' + token
      },
      body: formData
    });

    if (res.ok) {
      return await res.json().catch(() => ({}));
    }

    const errText = await res.text();
    console.error('Discord File Upload Error [' + channelId + ']: ' + res.status + ' ' + errText);
  } catch (uploadErr) {
    console.error('FormData error:', uploadErr);
  }

  // FALLBACK: Post clean embed with codeblock so transcript is 100% saved
  return await discordFetch('/channels/' + channelId + '/messages', {
    method: 'POST',
    body: JSON.stringify({
      ...payloadJson,
      content: (payloadJson.content ? payloadJson.content + '\n' : '') + '📄 **Transcript Archive:**\n```text\n' + fileContent.slice(-1700) + '\n```'
    })
  }).catch(e => console.error('Fallback transcript send error:', e));
}

// Generate full downloadable .txt transcript and archive to Transcripts Channel
async function generateAndArchiveTranscript(channelId, closedByUserId, closedByUsername, sendToLocalChannel = false) {
  try {
    const ch = await discordFetch('/channels/' + channelId).catch(() => ({}));
    const chName = ch.name || 'ticket-' + channelId;
    const topic = ch.topic || 'Zen2K Service Order';

    const msgs = await discordFetch('/channels/' + channelId + '/messages?limit=100').catch(() => []);
    const messageList = Array.isArray(msgs) ? msgs.reverse() : [];

    const clientMatch = topic.match(/\((\d{17,20})\)/) || topic.match(/Client:\s*(\S+)/);
    const clientInfo = clientMatch ? clientMatch[1] : 'Unknown Client';

    const header = [
      '================================================================================',
      'ZEN2K OFFICIAL TICKET TRANSCRIPT',
      '================================================================================',
      `Ticket Channel: #${chName}`,
      `Category ID: ${TICKETS_CATEGORY_ID}`,
      `Client: ${clientInfo}`,
      `Exported By: ${closedByUsername} (${closedByUserId})`,
      `Date & Time: ${new Date().toISOString()}`,
      `Total Messages Logged: ${messageList.length}`,
      '================================================================================\n'
    ].join('\n');

    const bodyLines = messageList.map(m => {
      const time = new Date(m.timestamp).toISOString().replace('T', ' ').slice(0, 19);
      const author = m.author ? `${m.author.username} (${m.author.id})` : 'Unknown';
      let content = m.content || '';
      if (m.embeds && m.embeds.length > 0) {
        const embedTitles = m.embeds.map(e => `[Embed: ${e.title || 'Card'}]`).join(' ');
        content = content ? `${content} ${embedTitles}` : embedTitles;
      }
      if (m.attachments && m.attachments.length > 0) {
        const atts = m.attachments.map(a => `[Attachment: ${a.url}]`).join(' ');
        content = content ? `${content} ${atts}` : atts;
      }
      return `[${time}] ${author}:\n  ${content || '(no content)'}\n`;
    });

    const footer = [
      '\n================================================================================',
      'END OF TRANSCRIPT • Zen2K Ticket Suite • Made by officialZen2K',
      '================================================================================'
    ].join('\n');

    const fullFileText = header + bodyLines.join('\n') + footer;
    const filename = `transcript-${chName}.txt`;

    const embedPayload = {
      embeds: [{
        title: '📑 TICKET TRANSCRIPT • #' + chName,
        description: '>>> 👤 **Client:** ' + (clientInfo.startsWith('<@') ? clientInfo : (isNaN(clientInfo) ? clientInfo : '<@' + clientInfo + '>')) + '\n' +
          '🔒 **Action By:** <@' + closedByUserId + '> (`' + closedByUsername + '`)\n' +
          '📁 **Attached File:** `' + filename + '`\n' +
          '📌 **Topic:** `' + topic.slice(0, 100) + '`\n' +
          '💬 **Total Messages:** `' + messageList.length + '`\n' +
          '🕒 **Exported At:** <t:' + Math.floor(Date.now() / 1000) + ':F>',
        color: 0x5865F2,
        footer: { text: 'Zen2K Automated Vault • officialZen2K' }
      }]
    };

    // 1. Send to the central Transcripts Channel with attached .txt file
    await sendDiscordMessageWithFile(TRANSCRIPTS_CHANNEL_ID, embedPayload, fullFileText, filename);

    // 2. If requested, also upload to the local ticket channel with attached .txt file
    if (sendToLocalChannel) {
      await sendDiscordMessageWithFile(channelId, {
        content: '📑 **Transcript successfully generated and attached below!**',
        ...embedPayload
      }, fullFileText, filename).catch(e => console.error('Local file upload error:', e));
    }

    return true;
  } catch (err) {
    console.error('Failed to generate and archive transcript:', err);
    return false;
  }
}

// AI Price Estimator Engine
function calculateAiQuote(projectText, speed = 'standard', budget = '') {
  const lower = projectText.toLowerCase();
  let baseMin = 25;
  let baseMax = 45;
  const scopeItems = ['Full Custom Architecture & Configuration'];

  if (lower.includes('bot') || lower.includes('discord')) {
    baseMin += 10;
    baseMax += 20;
    scopeItems.push('Discord Gateway Integration & Slash Commands');
  }
  if (lower.includes('database') || lower.includes('sqlite') || lower.includes('mongo') || lower.includes('sql')) {
    baseMin += 15;
    baseMax += 25;
    scopeItems.push('Persistent Database & Data Storage Engine');
  }
  if (lower.includes('web') || lower.includes('dashboard') || lower.includes('site') || lower.includes('frontend')) {
    baseMin += 25;
    baseMax += 45;
    scopeItems.push('Web Dashboard & Real-Time Control UI');
  }
  if (lower.includes('payment') || lower.includes('paypal') || lower.includes('stripe') || lower.includes('crypto')) {
    baseMin += 20;
    baseMax += 35;
    scopeItems.push('Automated Payment Verification & Webhook Handling');
  }
  if (lower.includes('fivem') || lower.includes('lua') || lower.includes('game') || lower.includes('roblox') || lower.includes('vc') || lower.includes('2k')) {
    baseMin += 20;
    baseMax += 40;
    scopeItems.push('Direct Account Loading & Ban-Proof Delivery');
  }
  if (lower.includes('api') || lower.includes('scrape') || lower.includes('ai') || lower.includes('openai')) {
    baseMin += 20;
    baseMax += 30;
    scopeItems.push('Third-Party API & Automated Intelligence Pipeline');
  }

  let timeline = '3 - 5 Business Days';
  if (speed === 'rush') {
    baseMin = Math.round(baseMin * 1.35);
    baseMax = Math.round(baseMax * 1.35);
    timeline = '24 - 48 Hours (Rush Service)';
  } else if (speed === 'flexible') {
    baseMin = Math.round(baseMin * 0.9);
    baseMax = Math.round(baseMax * 0.9);
    timeline = '1 - 2 Weeks (Flexible)';
  }

  scopeItems.push('End-to-End Safety Testing & Verification');
  scopeItems.push('Direct Setup Assistance & 7-Day Support Warranty');

  let priceString = '$' + baseMin + ' - $' + baseMax + ' USD';
  if (budget) {
    priceString += ' (Targeted around budget: ' + budget + ')';
  }

  return { price: priceString, timeline, scope: scopeItems };
}

// Parse pricing tiers cleanly from user input
function parseTiers(tiersRaw, priceRaw, serviceName = '') {
  const result = [];
  const raw = (tiersRaw && tiersRaw.trim()) ? tiersRaw : (priceRaw || '');

  let segments = [];
  if (raw.includes(',')) {
    segments = raw.split(',');
  } else if (raw.includes(';')) {
    segments = raw.split(';');
  } else {
    const chunkRegex = /(\$?\d+(?:\.\d+)?[kKmM]?\$?)\s*(?:for|-|:|–)?\s*(\$?\d+(?:\.\d+)?[kKmM]?\$?)/gi;
    const matches = [...raw.matchAll(chunkRegex)];
    if (matches.length >= 2) {
      for (const m of matches) {
        segments.push(m[0]);
      }
    } else {
      segments = [raw];
    }
  }

  for (const seg of segments) {
    const s = seg.trim();
    if (!s) continue;

    const priceMatch = s.match(/(?:\$\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*\$)/);
    const amountMatch = s.match(/(\d+(?:\.\d+)?\s*[kKmM](?:\s*VC)?|\d{1,3}(?:,\d{3})+\s*(?:VC)?)/i);

    if (priceMatch && amountMatch) {
      let pr = priceMatch[0].replace(/\s+/g, '');
      if (pr.endsWith('$')) pr = '$' + pr.slice(0, -1);
      else if (!pr.startsWith('$')) pr = '$' + pr;

      let amt = amountMatch[0].trim();
      if (!amt.toUpperCase().includes('VC') && serviceName.toLowerCase().includes('vc')) {
        amt += ' VC';
      }
      result.push({ name: amt, price: pr });
    } else {
      const sub = s.split(/[-–—:]/);
      if (sub.length >= 2) {
        let pName = sub[0].trim();
        let pPrice = sub.slice(1).join('-').trim();
        if (pPrice && !pPrice.startsWith('$') && !isNaN(pPrice)) pPrice = '$' + pPrice;
        result.push({ name: pName, price: pPrice });
      } else {
        result.push({ name: s, price: '' });
      }
    }
  }

  if (result.length === 0) {
    result.push({ name: serviceName || 'Standard Package', price: priceRaw || 'Contact Staff' });
  }
  return result;
}

// Build Tier Buttons (NO DROPDOWN OVERLAP! Clean 1-click ordering)
function buildTierButtons(tiers, serviceName) {
  const rows = [];
  const emojis = ['🪙', '⚡', '💎', '👑', '🔥'];

  if (tiers.length <= 5) {
    const tierComponents = tiers.map((t, idx) => {
      const sanitizedName = t.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
      const sanitizedPrice = t.price.replace(/[^a-zA-Z0-9$]/g, '').slice(0, 10);
      const labelText = (t.name + (t.price ? ' • ' + t.price : '')).slice(0, 80);
      return {
        type: 2,
        style: idx === 1 ? 3 : 1,
        label: labelText,
        custom_id: 'btn_tier_' + idx + '_' + sanitizedName + '_' + sanitizedPrice,
        emoji: { name: emojis[idx % emojis.length] }
      };
    });
    rows.push({ type: 1, components: tierComponents });
  } else {
    const row1 = tiers.slice(0, 5).map((t, idx) => ({
      type: 2,
      style: 1,
      label: (t.name + (t.price ? ' • ' + t.price : '')).slice(0, 80),
      custom_id: 'btn_tier_' + idx + '_' + t.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) + '_' + t.price.replace(/[^a-zA-Z0-9$]/g, '').slice(0, 10),
      emoji: { name: emojis[idx % emojis.length] }
    }));
    const row2 = tiers.slice(5, 10).map((t, idx) => ({
      type: 2,
      style: 1,
      label: (t.name + (t.price ? ' • ' + t.price : '')).slice(0, 80),
      custom_id: 'btn_tier_' + (idx + 5) + '_' + t.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) + '_' + t.price.replace(/[^a-zA-Z0-9$]/g, '').slice(0, 10),
      emoji: { name: emojis[(idx + 5) % emojis.length] }
    }));
    rows.push({ type: 1, components: row1 });
    rows.push({ type: 1, components: row2 });
  }

  rows.push({
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: 'Custom Order',
        custom_id: 'btn_order_pkg_' + serviceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25),
        emoji: { name: '🛒' }
      },
      {
        type: 2,
        style: 2,
        label: 'Ask Questions',
        custom_id: 'btn_order_inquire',
        emoji: { name: '❓' }
      },
      {
        type: 2,
        style: 2,
        label: 'Verified Vouches',
        custom_id: 'btn_view_reviews',
        emoji: { name: '⭐' }
      }
    ]
  });

  return rows;
}

// Build progress embed
function buildProgressEmbed(ticketNum, clientTag, clientId, serviceName, tierName, step = 1, staffId = null) {
  const steps = [
    { title: 'ORDER INITIALIZED', percent: '20%', bar: '[ 🟩⬜⬜⬜⬜ ]', desc: '⏳ Awaiting account credentials and payment verification.' },
    { title: 'PAYMENT CONFIRMED', percent: '60%', bar: '[ 🟩🟩🟩⬜⬜ ]', desc: '💳 Payment verified! Account queued for fulfillment.' },
    { title: 'IN DELIVERY', percent: '80%', bar: '[ 🟩🟩🟩🟩⬜ ]', desc: '⚡ Work in progress! Client: please stay logged off your account.' },
    { title: 'COMPLETED', percent: '100%', bar: '[ 🟩🟩🟩🟩🟩 ]', desc: '🎉 Order complete! Change your credentials and enjoy.' }
  ];

  const current = steps[step - 1] || steps[0];
  const staffInfo = staffId ? '<@' + staffId + '>' : 'Zen2K Staff';

  const embed = {
    title: '⚡ LIVE ORDER DASHBOARD • TICKET #' + ticketNum,
    description: '>>> 👑 **Client:** ' + (clientId ? '<@' + clientId + '>' : clientTag) + '\n📦 **Service:** `' + serviceName + '`' + (tierName ? '\n💎 **Package:** `' + tierName + '`' : '') + '\n🕒 **' + (step === 4 ? 'Status' : 'Estimated Delivery') + ':** `' + (step === 4 ? 'Order Complete & Delivered!' : '15 - 30 Minutes') + '`',
    color: step === 4 ? 0x57F287 : (step >= 2 ? 0x5865F2 : 0xFEE75C),
    fields: [
      {
        name: '📊 REAL-TIME ORDER PROGRESS',
        value: '```\n' + current.bar + ' ' + current.percent + ' — ' + current.title + '\n```\n' + current.desc,
        inline: false
      },
      step === 4 ? {
        name: '⭐ LEAVE A VOUCH & WIN REWARDS',
        value: '>>> 🌟 **Enjoyed our service?** Please click **[ ⭐ Leave a Vouch ]** below to share your feedback!\n🎰 **Loyalty Bonus:** Click **[ 🎰 Spin Reward Wheel ]** to win free bonus VC, discounts, or VIP roles!\nYour review will be posted directly to <#' + VOUCHES_CHANNEL_ID + '>.\n\n🔒 You may now safely log back in and change your credentials.',
        inline: false
      } : {
        name: '📋 CLIENT INSTRUCTIONS',
        value: '1️⃣ Send your platform (PSN / XBOX / PC) and credentials below.\n2️⃣ Provide 2FA backup codes if enabled to expedite delivery.\n3️⃣ Do **NOT** log in while progress shows `IN DELIVERY`.',
        inline: false
      }
    ],
    footer: { text: 'Zen2K Order Engine • Handled by ' + staffInfo + ' • Made by officialZen2K' }
  };

  return embed;
}

// Build progress buttons inside the active ticket
function buildProgressButtons(currentStep = 1) {
  if (currentStep === 4) {
    return [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: 'Leave a Vouch', custom_id: 'btn_modal_vouch', emoji: { name: '⭐' } },
          { type: 2, style: 1, label: 'Spin Reward Wheel', custom_id: 'btn_spin_wheel', emoji: { name: '🎰' } },
          { type: 2, style: 4, label: 'Close Ticket', custom_id: 'btn_close_ticket', emoji: { name: '🔒' } }
        ]
      },
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: 'Save Transcript', custom_id: 'btn_transcript_ticket', emoji: { name: '📑' } }
        ]
      }
    ];
  }
  return [
    {
      type: 1,
      components: [
        { type: 2, style: currentStep === 2 ? 3 : 1, label: 'Confirm Payment', custom_id: 'btn_prog_2', emoji: { name: '💳' } },
        { type: 2, style: currentStep === 3 ? 3 : 1, label: 'In Delivery', custom_id: 'btn_prog_3', emoji: { name: '⚙️' } },
        { type: 2, style: currentStep === 4 ? 3 : 1, label: 'Complete Order', custom_id: 'btn_prog_4', emoji: { name: '🏆' } }
      ]
    },
    {
      type: 1,
      components: [
        { type: 2, style: 4, label: 'Close Ticket', custom_id: 'btn_close_ticket', emoji: { name: '🔒' } },
        { type: 2, style: 2, label: 'Claim Ticket', custom_id: 'btn_claim_ticket', emoji: { name: '👤' } },
        { type: 2, style: 2, label: 'Save Transcript', custom_id: 'btn_transcript_ticket', emoji: { name: '📑' } }
      ]
    }
  ];
}

// Build TicketTool-style closed controls (Reopen, Transcript, Vouch, Delete)
function buildClosedControls() {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: 'Reopen Ticket', custom_id: 'btn_reopen_ticket', emoji: { name: '🔓' } },
        { type: 2, style: 1, label: 'Save Transcript', custom_id: 'btn_transcript_ticket', emoji: { name: '📑' } },
        { type: 2, style: 2, label: 'Leave a Vouch', custom_id: 'btn_modal_vouch', emoji: { name: '⭐' } },
        { type: 2, style: 4, label: 'Delete Ticket', custom_id: 'btn_delete_ticket', emoji: { name: '⛔' } }
      ]
    }
  ];
}

async function processInteraction(interaction) {
  const { type, data, guild_id, member, channel_id, message } = interaction;
  const user = member?.user;

  // TYPE 1: PING
  if (type === InteractionType.PING) {
    return { type: InteractionResponseType.PONG };
  }

  // TYPE 2: APPLICATION COMMAND
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    // --- /setup-tickets ---
    if (name === 'setup-tickets') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '⚡ Zen2K Support & Ticket Station',
            description: '>>> **Welcome to the official Zen2K Service Portal!**\n\nNeed instant delivery, custom development, billing help, or have a question?\nSelect a service category below to open a private encrypted channel with staff.',
            color: 0x5865F2,
            fields: [
              {
                name: '🛡️ Encrypted & Private',
                value: 'Every ticket creates a private channel visible only to you and verified staff.',
                inline: true
              },
              {
                name: '⚡ Fast Turnaround',
                value: 'Orders and inquiries are handled in real-time with live progress tracking.',
                inline: true
              }
            ],
            footer: { text: 'Zen2K Ticket Engine • Made by officialZen2K' }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: 'ticket_category_select',
                  placeholder: '👉 Select a ticket category...',
                  options: [
                    { label: 'Gaming & VC Orders', value: 'gaming_vc', description: 'Instant PSN / XBOX VC & game services', emoji: { name: '🎮' } },
                    { label: 'Custom Bot & Tech Commission', value: 'custom_dev', description: 'Direct high-tier bot & software development', emoji: { name: '⚡' } },
                    { label: 'Billing & Invoicing', value: 'billing', description: 'CashApp, PayPal, Crypto, or invoice verification', emoji: { name: '💳' } },
                    { label: 'General Support & Inquiries', value: 'general', description: 'Ask questions or get pre-order assistance', emoji: { name: '❓' } },
                    { label: 'VIP Priority Assistance', value: 'vip', description: 'Fast-track priority queue for verified clients', emoji: { name: '👑' } }
                  ]
                }
              ]
            }
          ]
        }
      };
    }

    // --- /setup-verify (Deploy Verification Panel) ---
    if (name === 'setup-verify') {
      if (!isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **Access Denied:** Only Zen2K staff can deploy the verification station.', flags: 64 }
        };
      }

      const targetRoleId = options?.find(o => o.name === 'role')?.value || VERIFIED_ROLE_ID;
      const targetChannelId = options?.find(o => o.name === 'channel')?.value;
      const customBanner = options?.find(o => o.name === 'banner_url')?.value;

      const verifyEmbed = {
        title: '🛡️ Zen2K Member Verification Station',
        description: '>>> **Welcome to the official Zen2K Community!**\n\nTo protect the server from automated bots and keep transactions secure, all members must verify their account.\n\nClick the button below to verify and receive the <@&' + targetRoleId + '> role instantly.',
        color: 0x00FFA3,
        fields: [
          {
            name: '🔓 Verification Unlocks',
            value: '• Full access to community chat & voice channels\n• Official VC pricing tables & instant project quotes\n• Private 1-on-1 encrypted order tickets & staff support',
            inline: false
          },
          {
            name: '📜 Security Policy',
            value: '• 0 tolerance for chargebacks, spam, or scams\n• Verified anti-troll blacklist system active 24/7',
            inline: false
          }
        ],
        footer: { text: 'Zen2K Security Engine • Made by officialZen2K' }
      };

      if (customBanner) {
        verifyEmbed.image = { url: customBanner };
      }

      const verifyPayload = {
        embeds: [verifyEmbed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3, // SUCCESS (Green)
                custom_id: 'btn_verify_member:' + targetRoleId,
                label: 'Verify Account',
                emoji: { name: '🛡️' }
              },
              {
                type: 2,
                style: 2, // SECONDARY (Grey)
                custom_id: 'btn_view_reviews',
                label: 'Customer Vouches',
                emoji: { name: '⭐' }
              }
            ]
          }
        ]
      };

      if (targetChannelId && targetChannelId !== channel_id) {
        try {
          await discordFetch('/channels/' + targetChannelId + '/messages', {
            method: 'POST',
            body: JSON.stringify(verifyPayload)
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Verification Station successfully deployed in <#' + targetChannelId + '>!', flags: 64 }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to deploy in <#' + targetChannelId + '>: ' + e.message, flags: 64 }
          };
        }
      }

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: verifyPayload
      };
    }

    // --- /verify (Direct Manual Verification Command) ---
    if (name === 'verify') {
      const isBlacklisted = await isMemberBlacklisted(guild_id, member);
      if (isBlacklisted) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '⛔ Verification Denied',
              description: '>>> Your account is currently on the Zen2K blacklist.\nYou are not eligible to verify or access community channels.',
              color: 0xED4245,
              footer: { text: 'Zen2K Security • Anti-Troll Engine' }
            }],
            flags: 64
          }
        };
      }

      const autoDb = await getAutoroleDb();
      const roleIdToGrant = autoDb?.roleId || VERIFIED_ROLE_ID;

      if (member?.roles && member.roles.includes(roleIdToGrant)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ **Already Verified:** You already have the <@&' + roleIdToGrant + '> role and full server access!', flags: 64 }
        };
      }

      try {
        await discordFetch('/guilds/' + guild_id + '/members/' + user.id + '/roles/' + roleIdToGrant, {
          method: 'PUT'
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '🎉 Verification Successful!',
              description: '>>> Welcome to **officialZen2K**!\nYou have been granted the <@&' + roleIdToGrant + '> role.\n\nAll server channels, pricing drops, and order ticket stations are now unlocked for your account.',
              color: 0x00FFA3,
              fields: [
                { name: '👤 Verified Member', value: `<@${user.id}>`, inline: true },
                { name: '🏷️ Role Granted', value: `<@&${roleIdToGrant}>`, inline: true }
              ],
              footer: { text: 'Zen2K Verification Engine • officialZen2K' }
            }],
            flags: 64
          }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **Verification Error:** Failed to assign role: ' + err.message + '\n*(Staff: ensure the bot role is dragged ABOVE the <@&' + roleIdToGrant + '> role in Discord Server Settings > Roles)*', flags: 64 }
        };
      }
    }

    // --- /pricing-create ---
    if (name === 'pricing-create') {
      const serviceName = options.find(o => o.name === 'service')?.value || 'Custom Service';
      const price = options.find(o => o.name === 'price')?.value || 'Inquire';
      const desc = options.find(o => o.name === 'description')?.value || 'High quality service delivered fast.';
      const tiersRaw = options.find(o => o.name === 'tiers')?.value || '';
      const rawFeatures = options.find(o => o.name === 'features')?.value || 'Instant Delivery, 100% Ban-Proof, 24/7 Verified Support';
      const payment = options.find(o => o.name === 'payment')?.value || 'CashApp • PayPal • Apple Pay • Crypto • Card';
      const customBanner = options.find(o => o.name === 'banner_url')?.value;
      const bannerUrl = customBanner || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtNXh4NmZkY3pnYTN5b2Zid3c2cW54cmh6bmZ5dmVib2E3bm1wNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kudIERsuoMrhxmdCYu/giphy.gif';

      const parsedTiers = parseTiers(tiersRaw, price, serviceName);
      const featureList = rawFeatures.split(',').map(f => '✅ ' + f.trim()).join('\n');

      const tierBullets = parsedTiers.map((t, idx) => {
        const badge = idx === 0 ? '🪙' : (idx === 1 ? '⚡' : (idx === 2 ? '💎' : '🔥'));
        const tag = idx === 1 ? ' *(🔥 Most Popular)*' : (idx === 2 ? ' *(👑 Best Value)*' : '');
        return badge + ' **' + t.name + '** ➔ `' + (t.price || 'Inquire') + '`' + tag;
      }).join('\n');

      let tiersTable = '';
      if (parsedTiers.length > 0) {
        tiersTable = '```\n' +
          '┌──────────────────────────────┬─────────────┐\n' +
          '│ PACKAGE / TIER               │ PRICE       │\n' +
          '├──────────────────────────────┼─────────────┤\n';
        for (const t of parsedTiers) {
          const tName = (t.name.length > 28 ? t.name.slice(0, 25) + '...' : t.name).padEnd(28, ' ');
          const tPrice = (t.price.length > 11 ? t.price.slice(0, 8) + '...' : t.price).padEnd(11, ' ');
          tiersTable += '│ ' + tName + ' │ ' + tPrice + ' │\n';
        }
        tiersTable += '└──────────────────────────────┴─────────────┘\n```';
      }

      const buttonRows = buildTierButtons(parsedTiers, serviceName);

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '⚡ ' + serviceName + ' • Pricing & Live Ordering',
            description: '>>> **' + desc + '**\n\n' +
              '💰 **Pricing Overview:** `' + price + '`\n\n' +
              '✨ **Click any package button below for instant 1-click order ticket!**',
            color: 0x00FFA3,
            image: { url: bannerUrl },
            fields: [
              { name: '💎 AVAILABLE PACKAGES & RATES', value: tierBullets + '\n' + tiersTable, inline: false },
              { name: '🛡️ GUARANTEE & ADVANTAGES', value: featureList, inline: false },
              { name: '💳 ACCEPTED PAYMENT METHODS', value: payment, inline: false }
            ],
            footer: { text: 'Zen2K Business • Click your package below to open an order ticket' }
          }],
          components: buttonRows
        }
      };
    }

    // --- /vouch (Post customer vouch card to VOUCHES_CHANNEL_ID 1529699140953702400) ---
    if (name === 'vouch') {
      const client = options.find(o => o.name === 'client')?.value || 'Customer';
      const review = options.find(o => o.name === 'review')?.value || '100% legit and fast delivery!';
      const service = options.find(o => o.name === 'service')?.value || 'Zen2K Service';
      const starsNum = options.find(o => o.name === 'stars')?.value || 5;
      const targetChannelId = options.find(o => o.name === 'channel')?.value || VOUCHES_CHANNEL_ID;
      const customImg = options.find(o => o.name === 'image')?.value || '';

      const starString = '⭐'.repeat(starsNum) + (starsNum === 5 ? ' (5/5 Stars • Flawless)' : ' (' + starsNum + '/5 Stars)');

      const vouchEmbed = {
        title: '⭐ OFFICIAL ZEN2K CUSTOMER VOUCH',
        description: '>>> 👤 **Verified Client:** ' + (client.startsWith('<@') ? client : '**' + client + '**') + '\n' +
          '📦 **Service / Package:** `' + service + '`\n' +
          '⭐ **Customer Rating:** ' + starString + '\n\n' +
          '💬 **Feedback:**\n*" ' + review + ' "*',
        color: 0xFEE75C,
        footer: { text: 'Zen2K Verified Transaction • Logged by ' + user.username + ' • officialZen2K' }
      };

      if (customImg && (customImg.startsWith('http://') || customImg.startsWith('https://'))) {
        vouchEmbed.image = { url: customImg };
      }

      await discordFetch('/channels/' + targetChannelId + '/messages', {
        method: 'POST',
        body: JSON.stringify({ embeds: [vouchEmbed] })
      }).catch(e => console.error('Post vouch error:', e));

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: '✅ Vouch card posted successfully to <#' + targetChannelId + '>!', flags: 64 }
      };
    }

    // --- /ai-quote ---
    if (name === 'ai-quote') {
      const projectText = options.find(o => o.name === 'project')?.value || 'Custom Project';
      const speed = options.find(o => o.name === 'speed')?.value || 'standard';
      const budget = options.find(o => o.name === 'budget')?.value || '';

      const quote = calculateAiQuote(projectText, speed, budget);
      const scopeChecklist = quote.scope.map(s => '• ' + s).join('\n');

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '🤖 AI Business Quote & Project Estimate',
            description: 'Here is the automated scope breakdown and pricing analysis for your project request:',
            color: 0x5865F2,
            fields: [
              { name: '📌 Project Request', value: '```\n' + projectText.slice(0, 300) + '\n```', inline: false },
              { name: '💰 Estimated Price Bracket', value: '**' + quote.price + '**', inline: true },
              { name: '⏱️ Estimated Turnaround', value: '**' + quote.timeline + '**', inline: true },
              { name: '📦 Included Deliverables & Milestones', value: scopeChecklist, inline: false }
            ],
            footer: { text: 'Zen2K AI Pricing Engine • Click below to start this order' }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3,
                  label: 'Accept Quote & Open Ticket',
                  custom_id: 'btn_quote_accept',
                  emoji: { name: '🤝' }
                }
              ]
            }
          ]
        }
      };
    }

    // --- /channel ---
    if (name === 'channel') {
      const sub = options?.[0];
      const subName = sub?.name;
      const subOpts = sub?.options || [];

      if (subName === 'create') {
        const chName = subOpts.find(o => o.name === 'name')?.value || 'new-channel';
        const isVoice = subOpts.find(o => o.name === 'type')?.value === 'voice';

        try {
          const newCh = await discordFetch('/guilds/' + guild_id + '/channels', {
            method: 'POST',
            body: JSON.stringify({ name: chName, type: isVoice ? 2 : 0 })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Created ' + (isVoice ? 'voice' : 'text') + ' channel: <#' + newCh.id + '>' }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to create channel: ' + e.message, flags: 64 }
          };
        }
      }

      if (subName === 'delete') {
        try {
          await discordFetch('/channels/' + channel_id, { method: 'DELETE' });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🗑️ Channel deleted successfully.' }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to delete channel: ' + e.message, flags: 64 }
          };
        }
      }

      if (subName === 'purge') {
        const amount = subOpts.find(o => o.name === 'amount')?.value || 10;
        try {
          const msgs = await discordFetch('/channels/' + channel_id + '/messages?limit=' + Math.min(amount, 100));
          if (Array.isArray(msgs) && msgs.length > 0) {
            const ids = msgs.map(m => m.id);
            await discordFetch('/channels/' + channel_id + '/messages/bulk-delete', {
              method: 'POST',
              body: JSON.stringify({ messages: ids })
            });
          }
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🧹 Cleared ' + amount + ' messages.', flags: 64 }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Purge error: ' + e.message, flags: 64 }
          };
        }
      }

      if (subName === 'lock') {
        try {
          await discordFetch('/channels/' + channel_id + '/permissions/' + guild_id, {
            method: 'PUT',
            body: JSON.stringify({ type: 0, deny: '2048' })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔒 Channel <#' + channel_id + '> is now locked.' }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Error locking channel: ' + e.message, flags: 64 }
          };
        }
      }

      if (subName === 'unlock') {
        try {
          await discordFetch('/channels/' + channel_id + '/permissions/' + guild_id, { method: 'DELETE' });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔓 Channel <#' + channel_id + '> is now unlocked.' }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Error unlocking channel: ' + e.message, flags: 64 }
          };
        }
      }
    }

    // --- /blacklist (Anti-Troll & Security Engine) ---
    if (name === 'blacklist') {
      if (!isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **Access Denied:** Only Zen2K staff and administrators can manage the blacklist.', flags: 64 }
        };
      }

      const sub = options?.[0];
      const subName = sub?.name;
      const subOpts = sub?.options || [];

      if (subName === 'add') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        const reason = subOpts.find(o => o.name === 'reason')?.value || 'Violating server rules / Chargeback risk';

        const db = await getBlacklistDb();
        db[targetUserId] = {
          userId: targetUserId,
          reason: reason,
          addedBy: user.username,
          addedById: user.id,
          date: new Date().toISOString()
        };
        await saveBlacklistDb(db);

        const roleId = await getBlacklistRoleId(guild_id);
        if (roleId) {
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId + '/roles/' + roleId, {
            method: 'PUT'
          }).catch(() => {});
        }

        const logEmbed = {
          title: '🛡️ ZEN2K SECURITY • USER BLACKLISTED',
          description: '>>> ⛔ **Blacklisted User:** <@' + targetUserId + '> (`' + targetUserId + '`)\n' +
            '👤 **Enforced By:** <@' + user.id + '> (`' + user.username + '`)\n' +
            '📋 **Reason:** `' + reason + '`\n' +
            '🕒 **Timestamp:** <t:' + Math.floor(Date.now() / 1000) + ':F>',
          color: 0xED4245,
          footer: { text: 'Zen2K Security Engine • officialZen2K' }
        };

        discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages', {
          method: 'POST',
          body: JSON.stringify({ embeds: [logEmbed] })
        }).catch(() => {});

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '🛡️ **Blacklisted successfully!** <@' + targetUserId + '> has been banned from opening tickets and orders.\n**Reason:** `' + reason + '`',
            flags: 64
          }
        };
      }

      if (subName === 'remove') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        const db = await getBlacklistDb();

        if (!db[targetUserId]) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '⚠️ <@' + targetUserId + '> is not currently blacklisted.', flags: 64 }
          };
        }

        delete db[targetUserId];
        await saveBlacklistDb(db);

        const roleId = await getBlacklistRoleId(guild_id);
        if (roleId) {
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId + '/roles/' + roleId, {
            method: 'DELETE'
          }).catch(() => {});
        }

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ <@' + targetUserId + '> has been **unblacklisted** and access is restored.', flags: 64 }
        };
      }

      if (subName === 'check') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        const db = await getBlacklistDb();
        const record = db[targetUserId];

        if (record) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: '🛡️ Blacklist Status: BLOCKED',
                description: '>>> ⛔ **User:** <@' + targetUserId + '>\n' +
                  '📋 **Reason:** `' + record.reason + '`\n' +
                  '👤 **Logged By:** <@' + record.addedById + '> (`' + record.addedBy + '`)\n' +
                  '🕒 **Logged At:** <t:' + Math.floor(new Date(record.date).getTime() / 1000) + ':R>',
                color: 0xED4245,
                footer: { text: 'Zen2K Security • officialZen2K' }
              }],
              flags: 64
            }
          };
        } else {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ <@' + targetUserId + '> is **CLEAN** (not blacklisted).', flags: 64 }
          };
        }
      }

      if (subName === 'list') {
        const db = await getBlacklistDb();
        const entries = Object.values(db);

        if (entries.length === 0) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🛡️ **Zen2K Blacklist is empty!** No users are currently blocked.', flags: 64 }
          };
        }

        const lines = entries.map((e, idx) => `${idx + 1}. <@${e.userId}> (\`${e.userId}\`) — **Reason:** ${e.reason} *(by ${e.addedBy})*`);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '🛡️ Zen2K Blacklisted Users (' + entries.length + ')',
              description: lines.join('\n').slice(0, 4000),
              color: 0xED4245,
              footer: { text: 'Zen2K Anti-Troll Security • officialZen2K' }
            }],
            flags: 64
          }
        };
      }
    }

    // --- /role (Role Maker & Management Engine) ---
    if (name === 'role') {
      if (!isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **Access Denied:** Only Zen2K staff and administrators can manage roles.', flags: 64 }
        };
      }

      const sub = options?.[0];
      const subName = sub?.name;
      const subOpts = sub?.options || [];

      // /role create name:<name> [color:<color>] [permissions:<preset>] [hoist:<bool>] [mentionable:<bool>]
      if (subName === 'create') {
        const rName = subOpts.find(o => o.name === 'name')?.value;
        const rColorInput = subOpts.find(o => o.name === 'color')?.value || '';
        const rPermsInput = subOpts.find(o => o.name === 'permissions')?.value || 'none';
        const rHoist = subOpts.find(o => o.name === 'hoist')?.value || false;
        const rMention = subOpts.find(o => o.name === 'mentionable')?.value || false;

        const colorInt = parseColorHex(rColorInput);
        const permsObj = resolvePermissions(rPermsInput);

        try {
          const createdRole = await discordFetch('/guilds/' + guild_id + '/roles', {
            method: 'POST',
            body: JSON.stringify({
              name: rName,
              color: colorInt,
              permissions: permsObj.bits,
              hoist: rHoist,
              mentionable: rMention
            })
          });

          const hexDisplay = '#' + (colorInt ? colorInt.toString(16).padStart(6, '0').toUpperCase() : '000000');
          const permsBullets = permsObj.list.map(p => '• ' + p).join('\n');

          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: '✨ Role Created Successfully',
                description: '>>> 🏷️ **Role:** <@&' + createdRole.id + '> (`' + createdRole.name + '`)\n' +
                  '🆔 **Role ID:** `' + createdRole.id + '`\n' +
                  '🎨 **Color:** `' + hexDisplay + '`\n' +
                  '🛡️ **Permissions:** ' + permsObj.label + '\n' +
                  '📌 **Hoisted in Sidebar:** `' + (rHoist ? 'Yes' : 'No') + '`\n' +
                  '🔔 **Mentionable:** `' + (rMention ? 'Yes' : 'No') + '`',
                fields: [
                  {
                    name: '📜 Active Permission Capabilities',
                    value: permsBullets.slice(0, 1000) || 'None',
                    inline: false
                  }
                ],
                color: colorInt || 0x57F287,
                footer: { text: 'Zen2K Role Maker • Created by ' + user.username }
              }]
            }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to create role: ' + err.message, flags: 64 }
          };
        }
      }

      // /role permissions role:<role> level:<preset>
      if (subName === 'permissions') {
        const targetRoleId = subOpts.find(o => o.name === 'role')?.value;
        const levelInput = subOpts.find(o => o.name === 'level')?.value || 'none';

        const permsObj = resolvePermissions(levelInput);

        try {
          await discordFetch('/guilds/' + guild_id + '/roles/' + targetRoleId, {
            method: 'PATCH',
            body: JSON.stringify({
              permissions: permsObj.bits
            })
          });

          const permsBullets = permsObj.list.map(p => '• ' + p).join('\n');

          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: '🛡️ Role Permissions Updated',
                description: '>>> 🏷️ **Role:** <@&' + targetRoleId + '>\n' +
                  '🔰 **New Permission Level:** ' + permsObj.label + '\n' +
                  '🆔 **Raw Bitmask:** `' + permsObj.bits + '`',
                fields: [
                  {
                    name: '📜 Active Capabilities Granted',
                    value: permsBullets.slice(0, 1000) || 'Default',
                    inline: false
                  }
                ],
                color: 0x5865F2,
                footer: { text: 'Zen2K Permissions Engine • Updated by ' + user.username }
              }]
            }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to update role permissions: ' + err.message, flags: 64 }
          };
        }
      }

      // /role give user:<user> role:<role>
      if (subName === 'give') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        const targetRoleId = subOpts.find(o => o.name === 'role')?.value;

        try {
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId + '/roles/' + targetRoleId, {
            method: 'PUT'
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Successfully assigned <@&' + targetRoleId + '> to <@' + targetUserId + '>.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to assign role: ' + err.message, flags: 64 }
          };
        }
      }

      // /role remove user:<user> role:<role>
      if (subName === 'remove') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        const targetRoleId = subOpts.find(o => o.name === 'role')?.value;

        try {
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId + '/roles/' + targetRoleId, {
            method: 'DELETE'
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Successfully removed <@&' + targetRoleId + '> from <@' + targetUserId + '>.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to remove role: ' + err.message, flags: 64 }
          };
        }
      }

      // /role delete role:<role>
      if (subName === 'delete') {
        const targetRoleId = subOpts.find(o => o.name === 'role')?.value;

        try {
          await discordFetch('/guilds/' + guild_id + '/roles/' + targetRoleId, {
            method: 'DELETE'
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🗑️ Successfully deleted role `' + targetRoleId + '` from the server.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to delete role: ' + err.message, flags: 64 }
          };
        }
      }

      // /role list
      if (subName === 'list') {
        try {
          const roles = await discordFetch('/guilds/' + guild_id + '/roles');
          const sorted = Array.isArray(roles) ? roles.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).slice(0, 25) : [];

          const lines = sorted.map(r => {
            const hex = '#' + (r.color ? r.color.toString(16).padStart(6, '0').toUpperCase() : '000000');
            const pBits = BigInt(r.permissions || '0');
            let tag = '`[MEMBER]`';
            if ((pBits & 0x8n) === 0x8n) tag = '`[ADMIN]`';
            else if ((pBits & 0x2000n) === 0x2000n || (pBits & 0x4n) === 0x4n) tag = '`[STAFF/MOD]`';
            else if (pBits === 0n) tag = '`[NONE]`';

            return `• <@&${r.id}> ${tag} — Color: \`${hex}\` | Pos: \`${r.position}\``;
          });

          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: '🏷️ Server Roles Overview (' + sorted.length + ')',
                description: lines.join('\n').slice(0, 4000),
                color: 0x5865F2,
                footer: { text: 'Zen2K Role Maker • officialZen2K' }
              }],
              flags: 64
            }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to list roles: ' + err.message, flags: 64 }
          };
        }
      }
    }

    // --- /autorole (Auto-Role Manager) ---
    if (name === 'autorole') {
      if (!isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **Access Denied:** Only Zen2K staff can manage auto-roles.', flags: 64 }
        };
      }

      const sub = options?.[0];
      const subName = sub?.name;
      const subOpts = sub?.options || [];

      // /autorole set role:<role>
      if (subName === 'set') {
        const targetRoleId = subOpts.find(o => o.name === 'role')?.value;
        if (!targetRoleId) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Please specify a role.', flags: 64 }
          };
        }

        const autoDb = {
          roleId: targetRoleId,
          enabled: true,
          setBy: user?.username || 'Staff',
          setAt: new Date().toISOString()
        };
        await saveAutoroleDb(autoDb);

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '⚙️ Zen2K Auto-Role Configured',
              description: '>>> **Auto-Role configuration updated successfully!**\nMembers who verify or interact with the server will automatically receive this role.',
              color: 0x00FFA3,
              fields: [
                { name: '🏷️ Designated Role', value: `<@&${targetRoleId}> (\`${targetRoleId}\`)`, inline: true },
                { name: '⚡ Status', value: '`🟢 ACTIVE`', inline: true },
                { name: '👤 Configured By', value: `<@${user.id}>`, inline: true }
              ],
              footer: { text: 'Zen2K Auto-Role Engine • officialZen2K' }
            }]
          }
        };
      }

      // /autorole check
      if (subName === 'check') {
        const autoDb = await getAutoroleDb();
        const activeRoleId = autoDb?.roleId || VERIFIED_ROLE_ID;
        const isEnabled = autoDb?.enabled !== false;

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '⚙️ Zen2K Auto-Role Status',
              description: '>>> Current server auto-role settings overview:',
              color: isEnabled ? 0x00FFA3 : 0xED4245,
              fields: [
                { name: '🏷️ Assigned Role', value: activeRoleId ? `<@&${activeRoleId}>` : '*None*', inline: true },
                { name: '⚡ Status', value: isEnabled ? '`🟢 ACTIVE`' : '`🔴 DISABLED`', inline: true },
                { name: '🕒 Last Updated', value: autoDb?.setAt ? `<t:${Math.floor(new Date(autoDb.setAt).getTime() / 1000)}:R>` : '*Default*', inline: true },
                { name: '💡 Tip', value: 'Use `/autorole set role:@role` to change, or configure Discord Server Settings > Onboarding for zero-click instant join roles.', inline: false }
              ],
              footer: { text: 'Zen2K Auto-Role Engine • officialZen2K' }
            }],
            flags: 64
          }
        };
      }

      // /autorole remove
      if (subName === 'remove') {
        await saveAutoroleDb({ roleId: null, enabled: false, setBy: user?.username, setAt: new Date().toISOString() });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔴 **Auto-Role Disabled:** Automatic role assignment has been turned off.' }
        };
      }
    }

    // --- /setup-voice-panel ---
    if (name === 'setup-voice-panel') {
      if (!isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **Access Denied:** Only Zen2K staff can deploy the Voice Control Panel.', flags: 64 }
        };
      }

      const targetChannelId = options?.find(o => o.name === 'channel')?.value || VOICE_PANEL_CHANNEL_ID;
      const panelPayload = buildVoiceControlPanelPayload();

      try {
        await discordFetch('/channels/' + targetChannelId + '/messages', {
          method: 'POST',
          body: JSON.stringify(panelPayload)
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ Voice Control Panel successfully deployed in <#' + targetChannelId + '>!', flags: 64 }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to deploy in <#' + targetChannelId + '>: ' + e.message, flags: 64 }
        };
      }
    }

    // --- /vc (Voice Controls) ---
    if (name === 'vc') {
      const sub = options?.[0];
      const subName = sub?.name;
      const subOpts = sub?.options || [];

      // Find user's active room
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      const activeChId = room?.id || (channel_id !== VOICE_PANEL_CHANNEL_ID ? channel_id : null);

      // /vc create [name] [limit]
      if (subName === 'create') {
        const rawName = subOpts.find(o => o.name === 'name')?.value || `${user.username}'s Squad`;
        const limit = Math.max(0, Math.min(99, subOpts.find(o => o.name === 'limit')?.value || 0));

        try {
          const newCh = await discordFetch('/guilds/' + guild_id + '/channels', {
            method: 'POST',
            body: JSON.stringify({
              name: `🔊 ${rawName}`,
              type: 2, // GUILD_VOICE
              user_limit: limit,
              permission_overwrites: [
                {
                  id: user.id,
                  type: 1, // Member
                  allow: '1048576' // CONNECT
                }
              ]
            })
          });

          // Save to DB
          const db = await getVoiceRoomsDb();
          db[user.id] = newCh.id;
          await saveVoiceRoomsDb(db);

          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🎉 **Voice Room Created:** <#${newCh.id}>\nClick to hop in! You can control your room in <#${VOICE_PANEL_CHANNEL_ID}>.`,
              flags: 64
            }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to create voice room: ' + err.message, flags: 64 }
          };
        }
      }

      if (!activeChId) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Voice Room:** You must create a room or join <#' + JOIN_TO_CREATE_VC_ID + '> first!', flags: 64 }
        };
      }

      // /vc lock
      if (subName === 'lock') {
        try {
          await discordFetch('/channels/' + activeChId + '/permissions/' + guild_id, {
            method: 'PUT',
            body: JSON.stringify({ type: 0, allow: '0', deny: '1048576' })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔒 Voice room <#' + activeChId + '> is now locked!' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to lock: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc unlock
      if (subName === 'unlock') {
        try {
          await discordFetch('/channels/' + activeChId + '/permissions/' + guild_id, {
            method: 'DELETE'
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔓 Voice room <#' + activeChId + '> is now unlocked!' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to unlock: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc mute user:<user>
      if (subName === 'mute') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        try {
          await discordFetch('/channels/' + activeChId + '/permissions/' + targetUserId, {
            method: 'PUT',
            body: JSON.stringify({ type: 1, allow: '0', deny: '2097152' })
          });
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId, {
            method: 'PATCH',
            body: JSON.stringify({ mute: true })
          }).catch(() => {});
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔇 <@' + targetUserId + '> has been muted in your voice room.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to mute user: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc unmute user:<user>
      if (subName === 'unmute') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        try {
          await discordFetch('/channels/' + activeChId + '/permissions/' + targetUserId, {
            method: 'DELETE'
          }).catch(() => {});
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId, {
            method: 'PATCH',
            body: JSON.stringify({ mute: false })
          }).catch(() => {});
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔊 <@' + targetUserId + '> has been unmuted in your voice room.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to unmute user: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc kick user:<user>
      if (subName === 'kick') {
        const targetUserId = subOpts.find(o => o.name === 'user')?.value;
        try {
          await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId, {
            method: 'PATCH',
            body: JSON.stringify({ channel_id: null })
          }).catch(() => {});
          await discordFetch('/channels/' + activeChId + '/permissions/' + targetUserId, {
            method: 'PUT',
            body: JSON.stringify({ type: 1, allow: '0', deny: '1048576' })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🚫 <@' + targetUserId + '> has been disconnected from your voice room.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to disconnect user: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc limit amount:<number>
      if (subName === 'limit') {
        const amount = Math.max(0, Math.min(99, subOpts.find(o => o.name === 'amount')?.value || 0));
        try {
          await discordFetch('/channels/' + activeChId, {
            method: 'PATCH',
            body: JSON.stringify({ user_limit: amount })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `👥 Voice room limit set to ${amount > 0 ? amount + ' players' : 'unlimited'}.` }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to update limit: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc rename name:<string>
      if (subName === 'rename') {
        const newName = subOpts.find(o => o.name === 'name')?.value || 'Squad Room';
        try {
          await discordFetch('/channels/' + activeChId, {
            method: 'PATCH',
            body: JSON.stringify({ name: '🔊 ' + newName })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✏️ Voice room renamed to `🔊 ' + newName + '`.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to rename: ' + err.message, flags: 64 }
          };
        }
      }

      // /vc delete
      if (subName === 'delete') {
        try {
          await discordFetch('/channels/' + activeChId, { method: 'DELETE' });
          const db = await getVoiceRoomsDb();
          delete db[user.id];
          await saveVoiceRoomsDb(db);
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🗑️ Voice channel deleted.' }
          };
        } catch (err) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Failed to delete: ' + err.message, flags: 64 }
          };
        }
      }
    }
  }

  // TYPE 3: MESSAGE COMPONENT
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id, values } = data;

    // ===== MASTER VOICE CONTROL PANEL (Channel 1549599836913803284) =====
    if (custom_id === 'btn_vcp_create') {
      const existing = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (existing) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ You already have an active squad room: <#' + existing.id + '>!', flags: 64 }
        };
      }

      try {
        const newCh = await discordFetch('/guilds/' + guild_id + '/channels', {
          method: 'POST',
          body: JSON.stringify({
            name: `🔊 ${user.username}'s Squad`,
            type: 2, // GUILD_VOICE
            permission_overwrites: [
              {
                id: user.id,
                type: 1, // Member
                allow: '1048576' // CONNECT
              }
            ]
          })
        });

        const db = await getVoiceRoomsDb();
        db[user.id] = newCh.id;
        await saveVoiceRoomsDb(db);

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🎉 **Voice Room Generated:** <#${newCh.id}>\nClick to hop in! You have full control over this channel.`,
            flags: 64
          }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to create room: ' + err.message, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_vcp_lock') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      try {
        await discordFetch('/channels/' + room.id + '/permissions/' + guild_id, {
          method: 'PUT',
          body: JSON.stringify({ type: 0, allow: '0', deny: '1048576' })
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔒 **Room Locked:** <#' + room.id + '> is now closed to new members.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to lock: ' + err.message, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_vcp_unlock') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      try {
        await discordFetch('/channels/' + room.id + '/permissions/' + guild_id, {
          method: 'DELETE'
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔓 **Room Unlocked:** <#' + room.id + '> is now open for friends.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to unlock: ' + err.message, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_vcp_delete') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** You do not have an active voice channel to delete.', flags: 64 }
        };
      }

      try {
        await discordFetch('/channels/' + room.id, { method: 'DELETE' });
        const db = await getVoiceRoomsDb();
        delete db[user.id];
        await saveVoiceRoomsDb(db);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🗑️ **Room Deleted:** Your voice channel has been removed.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to delete room: ' + err.message, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_vcp_limit') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_vcp_limit:' + room.id,
          title: '👥 Set Voice Room Limit',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'limit_val',
                  label: 'Player Limit (0 for unlimited, 2-99)',
                  style: 1,
                  min_length: 1,
                  max_length: 3,
                  placeholder: '2',
                  required: true
                }
              ]
            }
          ]
        }
      };
    }

    if (custom_id === 'btn_vcp_rename') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_vcp_rename:' + room.id,
          title: '✏️ Rename Your Voice Room',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'name_val',
                  label: 'New Channel Name',
                  style: 1,
                  min_length: 1,
                  max_length: 50,
                  placeholder: 'Ante-Up 2s Grind',
                  required: true
                }
              ]
            }
          ]
        }
      };
    }

    if (custom_id === 'btn_vcp_mute') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_vcp_mute:' + room.id,
          title: '🔇 Mute Member in Your Room',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_val',
                  label: 'User @mention or User ID',
                  style: 1,
                  min_length: 2,
                  max_length: 35,
                  placeholder: '@username or 123456789012345678',
                  required: true
                }
              ]
            }
          ]
        }
      };
    }

    if (custom_id === 'btn_vcp_unmute') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_vcp_unmute:' + room.id,
          title: '🔊 Unmute Member in Your Room',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_val',
                  label: 'User @mention or User ID',
                  style: 1,
                  min_length: 2,
                  max_length: 35,
                  placeholder: '@username or 123456789012345678',
                  required: true
                }
              ]
            }
          ]
        }
      };
    }

    if (custom_id === 'btn_vcp_kick') {
      const room = await getUserVoiceRoom(guild_id, user.id, user.username);
      if (!room) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ **No Active Room:** Join <#' + JOIN_TO_CREATE_VC_ID + '> or click **`[ ➕ Create Room ]`** first!', flags: 64 }
        };
      }

      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_vcp_kick:' + room.id,
          title: '🚫 Kick / Disconnect Member',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_val',
                  label: 'User @mention or User ID to disconnect',
                  style: 1,
                  min_length: 2,
                  max_length: 35,
                  placeholder: '@username or 123456789012345678',
                  required: true
                }
              ]
            }
          ]
        }
      };
    }

    // Button: Create Temporary Voice Room
    if (custom_id.startsWith('btn_create_vc:')) {
      const parts = custom_id.split(':');
      const limit = parseInt(parts[1]) || 0;
      const parentId = parts[2] || undefined;

      // Blacklist check
      const isBlacklisted = await isMemberBlacklisted(guild_id, member);
      if (isBlacklisted) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '⛔ Blacklisted users cannot create voice rooms.', flags: 64 }
        };
      }

      let chLabel = 'Squad';
      if (limit === 2) chLabel = '2s Park';
      else if (limit === 3) chLabel = '3s Park';
      else if (limit === 5) chLabel = '5s Pro-Am';

      try {
        const payload = {
          name: `🔊 ${user.username}'s ${chLabel}`,
          type: 2, // GUILD_VOICE
          user_limit: limit,
          permission_overwrites: [
            {
              id: user.id,
              type: 1, // Member
              allow: '1048576' // CONNECT
            }
          ]
        };
        if (parentId) payload.parent_id = parentId;

        const newCh = await discordFetch('/guilds/' + guild_id + '/channels', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '🎉 Temporary Voice Room Generated!',
              description: `>>> Your squad room is live and ready:\n👉 **<#${newCh.id}>**\n\nClick below to lock, unlock, or delete your channel once your squad is finished.`,
              color: 0x00FFA3,
              fields: [
                { name: '🏷️ Room', value: `<#${newCh.id}>`, inline: true },
                { name: '👥 Player Limit', value: limit > 0 ? `${limit} Players` : 'Unlimited', inline: true },
                { name: '👑 Manager', value: `<@${user.id}>`, inline: true }
              ],
              footer: { text: 'Zen2K Voice Hub • officialZen2K' }
            }],
            components: [
              {
                type: 1,
                components: [
                  { type: 2, style: 2, custom_id: `btn_vc_lock:${newCh.id}:${user.id}`, label: 'Lock Room', emoji: { name: '🔒' } },
                  { type: 2, style: 2, custom_id: `btn_vc_unlock:${newCh.id}:${user.id}`, label: 'Unlock Room', emoji: { name: '🔓' } },
                  { type: 2, style: 4, custom_id: `btn_vc_delete:${newCh.id}:${user.id}`, label: 'Delete Room', emoji: { name: '🗑️' } }
                ]
              }
            ],
            flags: 64
          }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to create voice room: ' + err.message, flags: 64 }
        };
      }
    }

    // Button: Lock Room
    if (custom_id.startsWith('btn_vc_lock:')) {
      const parts = custom_id.split(':');
      const targetChId = parts[1];
      const ownerId = parts[2];

      if (user.id !== ownerId && !isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Only the room owner (<@' + ownerId + '>) or staff can lock this channel.', flags: 64 }
        };
      }

      try {
        await discordFetch('/channels/' + targetChId + '/permissions/' + guild_id, {
          method: 'PUT',
          body: JSON.stringify({ type: 0, allow: '0', deny: '1048576' })
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔒 **Room Locked:** New members can no longer join <#' + targetChId + '>.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to lock room: ' + err.message, flags: 64 }
        };
      }
    }

    // Button: Unlock Room
    if (custom_id.startsWith('btn_vc_unlock:')) {
      const parts = custom_id.split(':');
      const targetChId = parts[1];
      const ownerId = parts[2];

      if (user.id !== ownerId && !isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Only the room owner (<@' + ownerId + '>) or staff can unlock this channel.', flags: 64 }
        };
      }

      try {
        await discordFetch('/channels/' + targetChId + '/permissions/' + guild_id, {
          method: 'DELETE'
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔓 **Room Unlocked:** Friends can now join <#' + targetChId + '> freely.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to unlock room: ' + err.message, flags: 64 }
        };
      }
    }

    // Button: Delete Room
    if (custom_id.startsWith('btn_vc_delete:')) {
      const parts = custom_id.split(':');
      const targetChId = parts[1];
      const ownerId = parts[2];

      if (user.id !== ownerId && !isStaff(member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Only the room owner (<@' + ownerId + '>) or staff can delete this channel.', flags: 64 }
        };
      }

      try {
        await discordFetch('/channels/' + targetChId, { method: 'DELETE' });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🗑️ **Room Deleted:** Your temporary voice channel has been removed.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to delete room: ' + err.message, flags: 64 }
        };
      }
    }

    // Verify Member Button
    if (custom_id.startsWith('btn_verify_member')) {
      const parts = custom_id.split(':');
      const autoDb = await getAutoroleDb();
      const roleIdToGrant = (parts[1] && parts[1] !== 'undefined') ? parts[1] : (autoDb?.roleId || VERIFIED_ROLE_ID);

      // 1. Check blacklist
      const isBlacklisted = await isMemberBlacklisted(guild_id, member);
      if (isBlacklisted) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '⛔ Verification Denied',
              description: '>>> Your account is currently on the Zen2K blacklist.\nYou are not eligible to verify or access community channels.',
              color: 0xED4245,
              footer: { text: 'Zen2K Security • Anti-Troll Engine' }
            }],
            flags: 64
          }
        };
      }

      // 2. Check if already verified
      if (member?.roles && member.roles.includes(roleIdToGrant)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '✅ **Already Verified:** You already have the <@&' + roleIdToGrant + '> role and full server access!',
            flags: 64
          }
        };
      }

      // 3. Grant the role
      try {
        await discordFetch('/guilds/' + guild_id + '/members/' + user.id + '/roles/' + roleIdToGrant, {
          method: 'PUT'
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '🎉 Verification Successful!',
              description: '>>> Welcome to **officialZen2K**!\nYou have been verified and granted the <@&' + roleIdToGrant + '> role.\n\nAll server channels, pricing drops, and order ticket stations are now unlocked.',
              color: 0x00FFA3,
              fields: [
                { name: '👤 Verified Member', value: `<@${user.id}>`, inline: true },
                { name: '🏷️ Role Granted', value: `<@&${roleIdToGrant}>`, inline: true }
              ],
              footer: { text: 'Zen2K Verification Engine • officialZen2K' }
            }],
            flags: 64
          }
        };
      } catch (err) {
        console.error('Failed to grant verified role:', err);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ **Verification Error:** Failed to assign role: ' + err.message + '\n*(Staff: please ensure the bot role is positioned ABOVE the <@&' + roleIdToGrant + '> role in Discord Server Settings > Roles)*',
            flags: 64
          }
        };
      }
    }

    // Vouches Button
    if (custom_id === 'btn_view_reviews') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          embeds: [{
            title: '⭐ Zen2K Verified Customer Reviews',
            description: '>>> **Store Rating: 4.98 / 5.0 (340+ Verified Orders)**\n\n' +
              '⭐ ⭐ ⭐ ⭐ ⭐\n' +
              '💬 *"Delivered 900k VC on my console in under 15 minutes, 100% legit."* — `@kyro`\n\n' +
              '⭐ ⭐ ⭐ ⭐ ⭐\n' +
              '💬 *"Vouch for Zen2K! Ban-proof, fast communication, legit seller."* — `@dante`\n\n' +
              '⭐ ⭐ ⭐ ⭐ ⭐\n' +
              '💬 *"Second time buying, got the 1.4M VC pack. Done super fast."* — `@jordan`\n\n' +
              '✅ All transactions protected with direct staff verification & warranty.\n' +
              '*Click the button below to submit your vouch to <#' + VOUCHES_CHANNEL_ID + '>!*',
            color: 0xFEE75C,
            footer: { text: 'Zen2K Verified Merchant • officialZen2K' }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3,
                  label: 'Submit a Vouch',
                  custom_id: 'btn_modal_vouch',
                  emoji: { name: '✍️' }
                }
              ]
            }
          ]
        }
      };
    }

    // 🎰 SPIN ZEN2K REWARD WHEEL
    if (custom_id === 'btn_spin_wheel') {
      const ch = await discordFetch('/channels/' + channel_id).catch(() => ({}));
      const chTopic = ch.topic || '';

      if (chTopic.includes('[SPUN]')) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ **Wheel Already Spun:** This ticket has already redeemed its reward wheel spin! Thank you for choosing Zen2K.',
            flags: 64
          }
        };
      }

      // Mark topic as spun to prevent double-spinning
      const newTopic = (chTopic + ' [SPUN]').slice(0, 1024);
      await discordFetch('/channels/' + channel_id, {
        method: 'PATCH',
        body: JSON.stringify({ topic: newTopic })
      }).catch(() => {});

      // Weighted prize generator
      const roll = Math.floor(Math.random() * 100) + 1;
      let prize = null;

      if (roll <= 8) {
        const code = 'JACKPOT-' + Math.floor(1000 + Math.random() * 9000);
        prize = {
          title: '💎 JACKPOT: +50,000 BONUS VC!',
          desc: 'Highest reward on the wheel! 50,000 Bonus VC added to your next order.',
          code: code,
          color: 0x00FFA3,
          tier: 'GRAND JACKPOT'
        };
      } else if (roll <= 35) {
        const code = 'SPIN15-' + Math.floor(1000 + Math.random() * 9000);
        prize = {
          title: '🎟️ 15% OFF YOUR NEXT ORDER',
          desc: '15% discount on any VC tier or service on your next ticket.',
          code: code,
          color: 0xFEE75C,
          tier: 'GOLD REWARD'
        };
      } else if (roll <= 65) {
        const code = 'RUSH-' + Math.floor(1000 + Math.random() * 9000);
        prize = {
          title: '⚡ FREE VIP RUSH DELIVERY UPGRADE',
          desc: 'Skip straight to the front of our delivery queue on your next order for $0.',
          code: code,
          color: 0x5865F2,
          tier: 'PRIORITY UPGRADE'
        };
      } else if (roll <= 85) {
        const code = 'ZEN5-' + Math.floor(1000 + Math.random() * 9000);
        prize = {
          title: '💵 $5 STORE CREDIT',
          desc: 'Enjoy $5 off any order above $25 on your next visit.',
          code: code,
          color: 0x57F287,
          tier: 'CASH CREDIT'
        };
      } else {
        prize = {
          title: '👑 ZEN2K LUCKY VIP STATUS',
          desc: 'Granted the exclusive Lucky Spinner badge role and VIP perks!',
          code: 'ROLE-GRANTED',
          color: 0xEB459E,
          tier: 'VIP STATUS'
        };

        try {
          const roles = await discordFetch('/guilds/' + guild_id + '/roles').catch(() => []);
          let spinnerRole = Array.isArray(roles) ? roles.find(r => r.name.toLowerCase().includes('lucky spinner') || r.name.toLowerCase().includes('zen2k lucky')) : null;
          if (!spinnerRole) {
            spinnerRole = await discordFetch('/guilds/' + guild_id + '/roles', {
              method: 'POST',
              body: JSON.stringify({
                name: '🎰 Zen2K Lucky Spinner',
                color: 0xEB459E,
                mentionable: false
              })
            });
          }
          if (spinnerRole?.id) {
            await discordFetch('/guilds/' + guild_id + '/members/' + user.id + '/roles/' + spinnerRole.id, {
              method: 'PUT'
            }).catch(() => {});
          }
        } catch (_) {}
      }

      const wheelEmbed = {
        title: '🎰 ZEN2K REWARD WHEEL • ' + prize.tier,
        description: '>>> 🎉 **Congratulations <@' + user.id + '>! The wheel stopped on:**\n\n' +
          '🏆 **' + prize.title + '**\n' +
          '📋 ' + prize.desc + '\n\n' +
          '🏷️ **Claim Code:** `' + prize.code + '`\n\n' +
          '*Show this code to staff in your next ticket to redeem your prize!*',
        color: prize.color,
        footer: { text: 'Zen2K Customer Loyalty Rewards • officialZen2K' }
      };

      await discordFetch('/channels/' + channel_id + '/messages', {
        method: 'POST',
        body: JSON.stringify({
          content: '🎉 <@' + user.id + '> just spun the **Zen2K Reward Wheel**!',
          embeds: [wheelEmbed]
        })
      });

      discordFetch('/channels/' + TRANSCRIPTS_CHANNEL_ID + '/messages', {
        method: 'POST',
        body: JSON.stringify({
          embeds: [{
            title: '🎰 WHEEL REWARD WON • #' + (ch.name || channel_id),
            description: '>>> 👤 **Winner:** <@' + user.id + '> (`' + user.username + '`)\n' +
              '🎁 **Reward:** `' + prize.title + '`\n' +
              '🏷️ **Code:** `' + prize.code + '`\n' +
              '🕒 **Timestamp:** <t:' + Math.floor(Date.now() / 1000) + ':F>',
            color: prize.color,
            footer: { text: 'Zen2K Audit Vault • officialZen2K' }
          }]
        })
      }).catch(() => {});

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '🎰 **You spun the wheel!** Check out your reward card in the chat above.',
          flags: 64
        }
      };
    }

    // Open Vouch Submission Modal (Routes directly to VOUCHES_CHANNEL_ID 1529699140953702400)
    if (custom_id === 'btn_modal_vouch') {
      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_submit_vouch',
          title: 'Zen2K • Leave a Vouch',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'vouch_service',
                  label: 'Service Purchased',
                  style: 1,
                  placeholder: 'e.g. 900K VC PSN, Custom Bot Setup',
                  required: true,
                  max_length: 80
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'vouch_rating',
                  label: 'Rating (1 to 5 Stars)',
                  style: 1,
                  value: '5',
                  required: true,
                  max_length: 2
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'vouch_comment',
                  label: 'Your Review / Experience',
                  style: 2,
                  placeholder: 'Fast delivery, smooth communication, 100% safe...',
                  required: true,
                  max_length: 500
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'vouch_image',
                  label: 'Proof / Screenshot Image URL (Optional)',
                  style: 1,
                  placeholder: 'Paste image link (e.g. imgur or discord url, leave blank if none)',
                  required: false,
                  max_length: 500
                }
              ]
            }
          ]
        }
      };
    }

    // Category Select on /setup-tickets
    if (custom_id === 'ticket_category_select') {
      if (await isMemberBlacklisted(guild_id, member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⛔ **ACCESS DENIED:** You have been blacklisted from opening tickets or placing orders with **Zen2K**.\nIf you believe this is an error, contact server management.',
            flags: 64
          }
        };
      }
      const selectedCat = values[0];
      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_open_ticket_' + selectedCat,
          title: 'Open Zen2K Support / Order Ticket',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'ticket_topic',
                  label: 'Subject / Service Needed',
                  style: 1,
                  placeholder: 'e.g. 450K VC PSN, Custom Bot, Payment Issue',
                  required: true,
                  max_length: 100
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'ticket_details',
                  label: 'Project Details & Platform Info',
                  style: 2,
                  placeholder: 'Describe your request, platform (PSN/XBOX/PC), and any preferences...',
                  required: true,
                  max_length: 1000
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'ticket_priority',
                  label: 'Delivery Speed (Standard / Rush / Instant)',
                  style: 1,
                  value: 'Instant',
                  required: false,
                  max_length: 20
                }
              ]
            }
          ]
        }
      };
    }

    // Direct Tier Button Click (1-Click Order) OR Legacy Dropdown OR General Buttons
    if (custom_id.startsWith('btn_tier_') || custom_id.startsWith('pricing_tier_select_') || custom_id.startsWith('btn_order_pkg_') || custom_id === 'btn_order_inquire' || custom_id === 'btn_quote_accept') {
      if (await isMemberBlacklisted(guild_id, member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⛔ **ACCESS DENIED:** You have been blacklisted from opening tickets or placing orders with **Zen2K**.\nIf you believe this is an error, contact server management.',
            flags: 64
          }
        };
      }
      let serviceLabel = 'Service Order';
      let tierLabel = '';

      if (custom_id.startsWith('btn_tier_')) {
        const parts = custom_id.replace('btn_tier_', '').split('_');
        const tIdx = parts[0];
        const tName = parts[1] || ('Tier #' + tIdx);
        const tPrice = parts[2] || '';
        tierLabel = tName + (tPrice ? ' (' + tPrice + ')' : '');
        serviceLabel = 'Order';
      } else if (custom_id.startsWith('pricing_tier_select_')) {
        const rawSelected = values?.[0] || '';
        serviceLabel = custom_id.replace('pricing_tier_select_', '').replace(/_/g, ' ');
        tierLabel = rawSelected.replace(/^tier_sel_\d+_/, '');
      } else if (custom_id.startsWith('btn_order_pkg_')) {
        serviceLabel = custom_id.replace('btn_order_pkg_', '').replace(/_/g, ' ');
      } else if (custom_id === 'btn_quote_accept') {
        serviceLabel = 'AI Quote';
      } else if (custom_id === 'btn_order_inquire') {
        serviceLabel = 'Inquiry';
      }

      const ticketRandom = Math.floor(1000 + Math.random() * 9000);
      const safeTierSlug = tierLabel ? tierLabel.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : 'order';
      const chName = 'ticket-' + safeTierSlug + '-' + ticketRandom;

      try {
        const overwrites = [
          { id: guild_id, type: 0, deny: '1024' },
          { id: user.id, type: 1, allow: '68608' }
        ];

        const staffRoleId = process.env.STAFF_ROLE_ID;
        if (staffRoleId) {
          overwrites.push({ id: staffRoleId, type: 0, allow: '68608' });
        }

        const channelPayload = {
          name: chName,
          type: 0,
          permission_overwrites: overwrites,
          topic: 'Zen2K Ticket #' + ticketRandom + ' | Client: ' + user.username + ' (' + user.id + ') | Service: ' + serviceLabel + (tierLabel ? ' [' + tierLabel + ']' : '')
        };

        if (TICKETS_CATEGORY_ID) {
          channelPayload.parent_id = TICKETS_CATEGORY_ID;
        }

        const newChannel = await discordFetch('/guilds/' + guild_id + '/channels', {
          method: 'POST',
          body: JSON.stringify(channelPayload)
        });

        const staffPing = staffRoleId ? (' | <@&' + staffRoleId + '>') : '';
        const progressEmbed = buildProgressEmbed(ticketRandom, user.username, user.id, serviceLabel, tierLabel, 1, null);
        const progressButtons = buildProgressButtons(1);

        await discordFetch('/channels/' + newChannel.id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            content: '<@' + user.id + '>' + staffPing,
            embeds: [progressEmbed],
            components: progressButtons
          })
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ Your ticket has been created in <#' + TICKETS_CATEGORY_ID + '>: <#' + newChannel.id + '>', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to open order channel: ' + err.message, flags: 64 }
        };
      }
    }

    // LIVE PROGRESS BUTTON UPDATES
    if (custom_id.startsWith('btn_prog_')) {
      const targetStep = parseInt(custom_id.replace('btn_prog_', ''), 10) || 1;
      const originalEmbed = message?.embeds?.[0] || {};
      const desc = originalEmbed.description || '';
      
      const sMatch = desc.match(/Service:\s*`([^`]+)`/);
      const serviceName = sMatch ? sMatch[1] : 'Order';
      const tMatch = desc.match(/Package:\s*`([^`]+)`/);
      const tierName = tMatch ? tMatch[1] : '';
      const cMatch = desc.match(/Client:\s*<@(\d+)>/);
      const clientId = cMatch ? cMatch[1] : null;

      const titleMatch = originalEmbed.title?.match(/#(\d+)/);
      const ticketNum = titleMatch ? titleMatch[1] : '0000';

      const updatedEmbed = buildProgressEmbed(ticketNum, user.username, clientId, serviceName, tierName, targetStep, user.id);
      const updatedButtons = buildProgressButtons(targetStep);

      let notifyText = '';
      let notifyEmbeds = [];
      let extraComponents = [];

      if (targetStep === 2) {
        notifyText = '💳 **Payment Confirmed!** Verified by <@' + user.id + '>. Order is now in the fulfillment queue!';
      } else if (targetStep === 3) {
        notifyText = '⚡ **In Delivery!** <@' + (clientId || user.id) + '> Work has begun on your account. Please stay logged out of your game.';
      } else if (targetStep === 4) {
        notifyText = '🎉 <@' + (clientId || user.id) + '> **YOUR ORDER IS OFFICIALLY COMPLETE!**';
        notifyEmbeds = [{
          title: '⭐ PLEASE LEAVE A VOUCH / REVIEW',
          description: '>>> Thank you for ordering with **Zen2K**!\n\nIf you enjoyed our service, please click **[ ⭐ Leave a Vouch ]** below to share your experience.\n\nAll verified customer vouches are showcased in <#' + VOUCHES_CHANNEL_ID + '>! ⭐⭐⭐⭐⭐',
          color: 0xFEE75C,
          footer: { text: 'Zen2K Verified Service • officialZen2K' }
        }];
        extraComponents = [
          {
            type: 1,
            components: [
              { type: 2, style: 3, label: 'Leave a Vouch', custom_id: 'btn_modal_vouch', emoji: { name: '⭐' } },
              { type: 2, style: 1, label: 'Spin Reward Wheel', custom_id: 'btn_spin_wheel', emoji: { name: '🎰' } },
              { type: 2, style: 4, label: 'Close Ticket', custom_id: 'btn_close_ticket', emoji: { name: '🔒' } }
            ]
          },
          {
            type: 1,
            components: [
              { type: 2, style: 2, label: 'Save Transcript', custom_id: 'btn_transcript_ticket', emoji: { name: '📑' } }
            ]
          }
        ];
      }

      if (notifyText) {
        const postPayload = { content: notifyText };
        if (notifyEmbeds.length > 0) postPayload.embeds = notifyEmbeds;
        if (extraComponents.length > 0) postPayload.components = extraComponents;

        discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify(postPayload)
        }).catch(err => console.error('Notify send error:', err));
      }

      // 🏷️ Feature 1: Dynamic Sidebar Channel Renaming
      let newChannelName = '';
      if (targetStep === 2) newChannelName = '💳-paid-' + ticketNum;
      else if (targetStep === 3) newChannelName = '⚡-delivering-' + ticketNum;
      else if (targetStep === 4) newChannelName = '✅-done-' + ticketNum;

      if (newChannelName) {
        discordFetch('/channels/' + channel_id, {
          method: 'PATCH',
          body: JSON.stringify({ name: newChannelName })
        }).catch(err => console.log('Sidebar rename notice:', err.message));
      }

      return {
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          embeds: [updatedEmbed],
          components: updatedButtons
        }
      };
    }

    // 🔒 CLOSE TICKET (Locks client chat permissions, auto-archives transcript to Transcripts channel, presents Reopen/Save/Vouch/Delete panel)
    if (custom_id === 'btn_close_ticket') {
      try {
        const ch = await discordFetch('/channels/' + channel_id).catch(() => ({}));
        const clientMatch = ch.topic?.match(/\((\d{17,20})\)/);
        const clientId = clientMatch ? clientMatch[1] : null;

        // 1. Lock channel permissions so client cannot type while ticket is closed
        if (clientId) {
          await discordFetch('/channels/' + channel_id + '/permissions/' + clientId, {
            method: 'PUT',
            body: JSON.stringify({ type: 1, deny: '2048', allow: '66560' })
          }).catch(() => {});
        }

        // 2. Auto-generate transcript and archive to Transcripts Channel (1529702818796015718) & local channel
        await generateAndArchiveTranscript(channel_id, user.id, user.username, true).catch(err => {
          console.error('Auto transcript on close error:', err);
        });

        // 3. Post closed controls panel
        const closedEmbed = {
          title: '🔒 Ticket Closed',
          description: '>>> **Ticket closed by <@' + user.id + '> (`' + user.username + '`).**\n\n' +
            '📑 **Transcript:** Saved to <#' + TRANSCRIPTS_CHANNEL_ID + '>.\n\n' +
            '**Support Team Controls:**\n' +
            '• 🔓 **Reopen**: Restores messaging access for client.\n' +
            '• 📑 **Save Transcript**: Download `.txt` file again.\n' +
            '• ⭐ **Leave a Vouch**: Submit a customer review to <#' + VOUCHES_CHANNEL_ID + '>.\n' +
            '• ⛔ **Delete Ticket**: Permanently deletes this channel immediately.',
          color: 0xED4245,
          footer: { text: 'Zen2K Ticket Controls • Made by officialZen2K' }
        };

        const closedButtons = buildClosedControls();

        // 🏷️ Rename channel to closed in sidebar
        const topicMatch = ch.topic?.match(/#(\d+)/);
        const nameMatch = ch.name?.match(/(\d{4})/);
        const tNum = topicMatch ? topicMatch[1] : (nameMatch ? nameMatch[1] : channel_id.slice(-4));
        discordFetch('/channels/' + channel_id, {
          method: 'PATCH',
          body: JSON.stringify({ name: '🔒-closed-' + tNum })
        }).catch(() => {});

        await discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            embeds: [closedEmbed],
            components: closedButtons
          })
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔒 Ticket closed by <@' + user.id + '>. Transcript saved to <#' + TRANSCRIPTS_CHANNEL_ID + '>.' }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Error closing channel: ' + e.message, flags: 64 }
        };
      }
    }

    // 🔓 REOPEN TICKET (Restores client chat permissions & active ticket buttons)
    if (custom_id === 'btn_reopen_ticket') {
      try {
        const ch = await discordFetch('/channels/' + channel_id).catch(() => ({}));
        const clientMatch = ch.topic?.match(/\((\d{17,20})\)/);
        const clientId = clientMatch ? clientMatch[1] : null;

        if (clientId) {
          await discordFetch('/channels/' + channel_id + '/permissions/' + clientId, {
            method: 'PUT',
            body: JSON.stringify({ type: 1, allow: '68608' })
          }).catch(() => {});
        }

        // 🏷️ Restore ticket channel name in sidebar
        const topicMatch = ch.topic?.match(/#(\d+)/);
        const nameMatch = ch.name?.match(/(\d{4})/);
        const tNum = topicMatch ? topicMatch[1] : (nameMatch ? nameMatch[1] : channel_id.slice(-4));
        discordFetch('/channels/' + channel_id, {
          method: 'PATCH',
          body: JSON.stringify({ name: 'ticket-' + tNum })
        }).catch(() => {});

        const reopenEmbed = {
          title: '🔓 Ticket Reopened',
          description: 'This ticket has been officially reopened by <@' + user.id + '>. Client permissions have been restored.',
          color: 0x57F287
        };

        await discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            embeds: [reopenEmbed],
            components: buildProgressButtons(1)
          })
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔓 Ticket reopened by <@' + user.id + '>.' }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Error reopening channel: ' + e.message, flags: 64 }
        };
      }
    }

    // 📑 SAVE TRANSCRIPT (Attaches downloadable .txt file to current channel AND transcripts vault)
    if (custom_id === 'btn_transcript_ticket') {
      try {
        await generateAndArchiveTranscript(channel_id, user.id, user.username, true);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '📑 **Transcript generated!** Downloadable `.txt` file attached above and archived in <#' + TRANSCRIPTS_CHANNEL_ID + '>.',
            flags: 64
          }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to generate transcript file: ' + e.message, flags: 64 }
        };
      }
    }

    // ⛔ DELETE TICKET (Instant channel deletion - NO auto-save on delete)
    if (custom_id === 'btn_delete_ticket') {
      try {
        await discordFetch('/channels/' + channel_id, { method: 'DELETE' });
        return {
          type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE
        };
      } catch (e) {
        console.error('Delete ticket error:', e);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Error deleting channel: ' + e.message, flags: 64 }
        };
      }
    }

    // Claim Ticket
    if (custom_id === 'btn_claim_ticket') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '👤 Ticket Claimed',
            description: 'This ticket has been officially claimed by <@' + user.id + '>. They will be assisting you directly.',
            color: 0x57F287
          }]
        }
      };
    }
  }

  // TYPE 5: MODAL SUBMIT
  if (type === InteractionType.MODAL_SUBMIT) {
    const customId = data.custom_id;

    // Vouch Submission Modal Submit -> ALWAYS POSTS TO VOUCHES_CHANNEL_ID (1529699140953702400)
    if (customId === 'modal_submit_vouch') {
      const service = data.components[0]?.components[0]?.value || 'Zen2K Service';
      const rawRating = parseInt(data.components[1]?.components[0]?.value, 10) || 5;
      const comment = data.components[2]?.components[0]?.value || 'Great service!';
      const rawImage = data.components[3]?.components[0]?.value?.trim() || '';

      const starsNum = Math.min(Math.max(rawRating, 1), 5);
      const starString = '⭐'.repeat(starsNum) + (starsNum === 5 ? ' (5/5 Stars • Flawless)' : ' (' + starsNum + '/5 Stars)');

      // Only include image if user explicitly provided a valid URL in the modal input
      let finalImageUrl = '';
      if (rawImage && (rawImage.startsWith('http://') || rawImage.startsWith('https://'))) {
        finalImageUrl = rawImage;
      }

      const vouchEmbed = {
        title: '⭐ OFFICIAL ZEN2K CUSTOMER VOUCH',
        description: '>>> 👤 **Verified Client:** <@' + user.id + '> (`' + user.username + '`)\n' +
          '📦 **Service / Package:** `' + service + '`\n' +
          '⭐ **Customer Rating:** ' + starString + '\n\n' +
          '💬 **Feedback:**\n*" ' + comment + ' "*' +
          (finalImageUrl ? '\n\n🖼️ **Proof / Screenshot:** Attached below' : ''),
        color: 0xFEE75C,
        footer: { text: 'Zen2K Verified Transaction • Submitted by ' + user.username + ' • officialZen2K' }
      };

      if (finalImageUrl) {
        vouchEmbed.image = { url: finalImageUrl };
      }

      // 1. Post directly into the designated Vouches Channel (1529699140953702400)
      await discordFetch('/channels/' + VOUCHES_CHANNEL_ID + '/messages', {
        method: 'POST',
        body: JSON.stringify({ embeds: [vouchEmbed] })
      }).catch(e => console.error('Post vouch to channel error:', e));

      // 2. Also drop a friendly notice in the ticket if submitted from ticket channel
      if (channel_id !== VOUCHES_CHANNEL_ID) {
        await discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            embeds: [{
              title: '⭐ Vouch Successfully Submitted',
              description: 'Thank you <@' + user.id + '>! Your review card has been posted to <#' + VOUCHES_CHANNEL_ID + '>.',
              color: 0x57F287
            }]
          })
        }).catch(() => {});
      }

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: '✅ Thank you for your vouch, <@' + user.id + '>! Your review is live in <#' + VOUCHES_CHANNEL_ID + '>.', flags: 64 }
      };
    }

    // Voice Control Panel Modals
    if (customId.startsWith('modal_vcp_limit:')) {
      const targetRoomId = customId.split(':')[1];
      const rawLimit = parseInt(data.components[0]?.components[0]?.value, 10);
      const newLimit = isNaN(rawLimit) ? 0 : Math.min(Math.max(rawLimit, 0), 99);
      try {
        await discordFetch('/channels/' + targetRoomId, {
          method: 'PATCH',
          body: JSON.stringify({ user_limit: newLimit })
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '👥 **Player Limit Updated:** Your room limit is now set to **' + (newLimit === 0 ? 'Unlimited' : newLimit + ' players') + '**.',
            flags: 64
          }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to update limit: ' + err.message, flags: 64 }
        };
      }
    }

    if (customId.startsWith('modal_vcp_rename:')) {
      const targetRoomId = customId.split(':')[1];
      const newName = (data.components[0]?.components[0]?.value || '').trim().slice(0, 50);
      if (!newName) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Room name cannot be empty.', flags: 64 }
        };
      }
      try {
        await discordFetch('/channels/' + targetRoomId, {
          method: 'PATCH',
          body: JSON.stringify({ name: '🔊 ' + newName })
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✏️ **Voice Room Renamed:** Channel is now named **🔊 ' + newName + '**.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to rename room: ' + err.message, flags: 64 }
        };
      }
    }

    if (customId.startsWith('modal_vcp_mute:')) {
      const targetRoomId = customId.split(':')[1];
      const rawInput = data.components[0]?.components[0]?.value?.trim() || '';
      const targetUserId = await resolveUserId(guild_id, rawInput);
      if (!targetUserId) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Could not find member `' + rawInput + '`. Please provide a valid @mention or User ID.', flags: 64 }
        };
      }
      try {
        await discordFetch('/channels/' + targetRoomId + '/permissions/' + targetUserId, {
          method: 'PUT',
          body: JSON.stringify({ type: 1, allow: '0', deny: '2097152' })
        });
        await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId, {
          method: 'PATCH',
          body: JSON.stringify({ mute: true })
        }).catch(() => {});
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔇 **User Silenced:** <@' + targetUserId + '> is now muted in your voice room.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to mute user: ' + err.message, flags: 64 }
        };
      }
    }

    if (customId.startsWith('modal_vcp_unmute:')) {
      const targetRoomId = customId.split(':')[1];
      const rawInput = data.components[0]?.components[0]?.value?.trim() || '';
      const targetUserId = await resolveUserId(guild_id, rawInput);
      if (!targetUserId) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Could not find member `' + rawInput + '`. Please provide a valid @mention or User ID.', flags: 64 }
        };
      }
      try {
        await discordFetch('/channels/' + targetRoomId + '/permissions/' + targetUserId, {
          method: 'DELETE'
        }).catch(() => {});
        await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId, {
          method: 'PATCH',
          body: JSON.stringify({ mute: false })
        }).catch(() => {});
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔊 **User Unmuted:** <@' + targetUserId + '> can now speak in your voice room.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to unmute user: ' + err.message, flags: 64 }
        };
      }
    }

    if (customId.startsWith('modal_vcp_kick:')) {
      const targetRoomId = customId.split(':')[1];
      const rawInput = data.components[0]?.components[0]?.value?.trim() || '';
      const targetUserId = await resolveUserId(guild_id, rawInput);
      if (!targetUserId) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Could not find member `' + rawInput + '`. Please provide a valid @mention or User ID.', flags: 64 }
        };
      }
      try {
        await discordFetch('/guilds/' + guild_id + '/members/' + targetUserId, {
          method: 'PATCH',
          body: JSON.stringify({ channel_id: null })
        }).catch(() => {});
        await discordFetch('/channels/' + targetRoomId + '/permissions/' + targetUserId, {
          method: 'PUT',
          body: JSON.stringify({ type: 1, allow: '0', deny: '1048576' })
        });
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🚫 **User Disconnected:** <@' + targetUserId + '> has been kicked from your voice room.', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to disconnect user: ' + err.message, flags: 64 }
        };
      }
    }

    // Open Ticket Modal Submit
    if (customId.startsWith('modal_open_ticket_')) {
      if (await isMemberBlacklisted(guild_id, member)) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⛔ **ACCESS DENIED:** You have been blacklisted from opening tickets or placing orders with **Zen2K**.\nContact server administration if you believe this is an error.',
            flags: 64
          }
        };
      }
      const category = customId.replace('modal_open_ticket_', '');
      const topic = data.components[0].components[0].value;
      const details = data.components[1].components[0].value;
      const priority = data.components[2]?.components[0]?.value || 'Normal';

      const ticketRandom = Math.floor(1000 + Math.random() * 9000);
      const chName = 'ticket-' + category.slice(0, 8) + '-' + ticketRandom;

      try {
        const overwrites = [
          { id: guild_id, type: 0, deny: '1024' },
          { id: user.id, type: 1, allow: '68608' }
        ];

        const staffRoleId = process.env.STAFF_ROLE_ID;
        if (staffRoleId) {
          overwrites.push({ id: staffRoleId, type: 0, allow: '68608' });
        }

        const channelPayload = {
          name: chName,
          type: 0,
          permission_overwrites: overwrites,
          topic: 'Ticket #' + ticketRandom + ' | Opened by ' + user.username + ' (' + user.id + ') | Category: ' + category
        };

        if (TICKETS_CATEGORY_ID) {
          channelPayload.parent_id = TICKETS_CATEGORY_ID;
        }

        const newChannel = await discordFetch('/guilds/' + guild_id + '/channels', {
          method: 'POST',
          body: JSON.stringify(channelPayload)
        });

        const staffPing = staffRoleId ? (' | <@&' + staffRoleId + '>') : '';
        const progressEmbed = buildProgressEmbed(ticketRandom, user.username, user.id, topic, priority, 1, null);
        const progressButtons = buildProgressButtons(1);

        await discordFetch('/channels/' + newChannel.id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            content: '<@' + user.id + '>' + staffPing,
            embeds: [progressEmbed],
            components: progressButtons
          })
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ Your ticket has been created in <#' + TICKETS_CATEGORY_ID + '>: <#' + newChannel.id + '>', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to create ticket channel: ' + err.message, flags: 64 }
        };
      }
    }
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: 'Unhandled interaction.', flags: 64 }
  };
}

export async function POST(request) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const rawBody = await request.text();

    const clientPublicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!clientPublicKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: missing public key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isValid = await verifyKey(rawBody, signature || '', timestamp || '', clientPublicKey);
    if (!isValid) {
      return new Response('Bad request signature', { status: 401 });
    }

    const interaction = JSON.parse(rawBody);
    const responsePayload = await processInteraction(interaction);

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Web POST error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default async function handler(req, res) {
  if (req instanceof Request || (req.headers && typeof req.headers.get === 'function' && typeof req.text === 'function')) {
    return POST(req);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const clientPublicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!clientPublicKey) {
      return res.status(500).json({ error: 'Server configuration error: missing public key' });
    }

    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf-8');
    } else if (req.body && typeof req.body === 'object') {
      rawBody = JSON.stringify(req.body);
    } else {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      rawBody = Buffer.concat(chunks).toString('utf-8');
    }

    const isValid = await verifyKey(rawBody, signature || '', timestamp || '', clientPublicKey);
    if (!isValid) {
      return res.status(401).send('Bad request signature');
    }

    const interaction = typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody);

    const responsePayload = await processInteraction(interaction);
    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('Node handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
