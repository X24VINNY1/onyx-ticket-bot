const DISCORD_API = 'https://discord.com/api/v10';

export async function GET(request) {
  return handleRegister();
}

export async function POST(request) {
  return handleRegister();
}

export default async function handler(req, res) {
  const result = await runRegistration();
  if (res && typeof res.status === 'function') {
    return res.status(result.status).json(result.data);
  }
  return new Response(JSON.stringify(result.data), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRegister() {
  const result = await runRegistration();
  return new Response(JSON.stringify(result.data), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function runRegistration() {
  const token = process.env.DISCORD_TOKEN;
  const appId = process.env.DISCORD_APP_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !appId) {
    return {
      status: 400,
      data: { error: 'Missing DISCORD_TOKEN or DISCORD_APP_ID in Vercel Environment Variables.' }
    };
  }

  const commands = [
    {
      name: 'setup-tickets',
      description: 'Deploy the interactive ticket station panel in this channel',
      type: 1
    },
    {
      name: 'setup-verify',
      description: 'Deploy the Zen2K Member Verification Station in this channel',
      type: 1,
      options: [
        { name: 'channel', description: 'Channel to deploy verification panel to (default: current channel)', type: 7, required: false },
        { name: 'role', description: 'Role to grant upon verification (default: 1529699129176100914)', type: 8, required: false },
        { name: 'banner_url', description: 'Custom banner image or animated GIF URL', type: 3, required: false }
      ]
    },
    {
      name: 'verify',
      description: 'Verify your account to unlock server channels and ticket station',
      type: 1
    },
    {
      name: 'pricing-create',
      description: 'Create an animated pricing embed with Tier Dropdowns and Order Ticket buttons',
      type: 1,
      options: [
        { name: 'service', description: 'Product or Service Title (e.g. PSN & XBOX VC, Discord Bot)', type: 3, required: true },
        { name: 'price', description: 'Price tag or overview (e.g. $60 for 450K, $120 for 900K)', type: 3, required: true },
        { name: 'description', description: 'Overview description or requirements (e.g. WILL NEED ACCOUNT INFO)', type: 3, required: true },
        { name: 'tiers', description: 'Comma-separated tiers for buttons (e.g. 450K - $60, 900K - $120, 1.4M - $150)', type: 3, required: false },
        { name: 'features', description: 'Comma-separated features list (e.g. Fast Delivery, 24/7 Support, Safe & Ban-Proof)', type: 3, required: false },
        { name: 'payment', description: 'Payment methods accepted (e.g. CashApp, Crypto, Apple Pay)', type: 3, required: false },
        { name: 'banner_url', description: 'Animated banner GIF image URL', type: 3, required: false },
        { name: 'vouches', description: 'Custom vouches summary (e.g. Fast delivery in 10 mins! - @kyro)', type: 3, required: false }
      ]
    },
    {
      name: 'vouch',
      description: 'Create and post an official verified customer vouch card',
      type: 1,
      options: [
        { name: 'client', description: 'Client username or mention (e.g. @kyro or John)', type: 3, required: true },
        { name: 'review', description: 'Customer review comment or feedback', type: 3, required: true },
        { name: 'service', description: 'Service or package delivered (e.g. 900K VC)', type: 3, required: false },
        {
          name: 'stars',
          description: 'Rating out of 5 stars',
          type: 4,
          required: false,
          choices: [
            { name: '⭐⭐⭐⭐⭐ (5 Stars - Flawless)', value: 5 },
            { name: '⭐⭐⭐⭐ (4 Stars - Great)', value: 4 },
            { name: '⭐⭐⭐ (3 Stars - Average)', value: 3 }
          ]
        },
        { name: 'image', description: 'Screenshot or proof image URL to attach to vouch', type: 3, required: false },
        { name: 'channel', description: 'Channel to send vouch card to (e.g. #vouches)', type: 7, required: false }
      ]
    },
    {
      name: 'ai-quote',
      description: 'AI-powered project price estimator that builds an animated quote embed with an Order button',
      type: 1,
      options: [
        { name: 'project', description: 'Describe what the client or project needs', type: 3, required: true },
        {
          name: 'speed',
          description: 'Delivery turnaround speed',
          type: 3,
          required: false,
          choices: [
            { name: 'Standard (3-5 days)', value: 'standard' },
            { name: 'Rush (24-48 hours)', value: 'rush' },
            { name: 'Flexible (1-2 weeks)', value: 'flexible' }
          ]
        },
        { name: 'budget', description: 'Client target budget (e.g. $40)', type: 3, required: false }
      ]
    },
    {
      name: 'channel',
      description: 'Server channel management commands',
      type: 1,
      options: [
        {
          name: 'create',
          description: 'Create a new text or voice channel',
          type: 1,
          options: [
            { name: 'name', description: 'Channel name', type: 3, required: true },
            {
              name: 'type',
              description: 'Channel type',
              type: 3,
              required: false,
              choices: [
                { name: 'Text', value: 'text' },
                { name: 'Voice', value: 'voice' }
              ]
            }
          ]
        },
        {
          name: 'delete',
          description: 'Delete current channel',
          type: 1
        },
        {
          name: 'purge',
          description: 'Clear messages in this channel',
          type: 1,
          options: [
            { name: 'amount', description: 'Number of messages (1-100)', type: 4, required: true }
          ]
        },
        {
          name: 'lock',
          description: 'Lock this channel for members',
          type: 1
        },
        {
          name: 'unlock',
          description: 'Unlock this channel',
          type: 1
        }
      ]
    },
    {
      name: 'blacklist',
      description: 'Zen2K Anti-Troll & Blacklist Management (Staff Only)',
      type: 1,
      options: [
        {
          name: 'add',
          description: 'Block a user from opening tickets or placing orders',
          type: 1,
          options: [
            { name: 'user', description: 'User to blacklist', type: 6, required: true },
            { name: 'reason', description: 'Reason for blacklist (e.g. Chargeback, Troll)', type: 3, required: false }
          ]
        },
        {
          name: 'remove',
          description: 'Unblock a user from the blacklist',
          type: 1,
          options: [
            { name: 'user', description: 'User to unblacklist', type: 6, required: true }
          ]
        },
        {
          name: 'check',
          description: 'Check if a user is currently blacklisted',
          type: 1,
          options: [
            { name: 'user', description: 'User to check', type: 6, required: true }
          ]
        },
        {
          name: 'list',
          description: 'View all currently blacklisted users',
          type: 1
        }
      ]
    },
    {
      name: 'role',
      description: 'Zen2K Role Maker & Management (Staff Only)',
      type: 1,
      options: [
        {
          name: 'create',
          description: 'Create a custom role with color, permissions, and options',
          type: 1,
          options: [
            { name: 'name', description: 'Name of the new role (e.g. VIP, Moderator, Support)', type: 3, required: true },
            { name: 'color', description: 'Color hex or name (e.g. #00FFA3, gold, red, blue, purple)', type: 3, required: false },
            {
              name: 'permissions',
              description: 'Permission level preset for this role',
              type: 3,
              required: false,
              choices: [
                { name: '👑 Admin (Full Administrator)', value: 'admin' },
                { name: '🛡️ Moderator (Kick, Ban, Mute, Delete Messages)', value: 'mod' },
                { name: '⚡ Support Staff (Manage Messages, Attach Files)', value: 'support' },
                { name: '👤 Verified Member / Customer (Standard Chat)', value: 'member' },
                { name: '👁️ Read Only (View Channels Only)', value: 'readonly' },
                { name: '⛔ None (0 Permissions)', value: 'none' }
              ]
            },
            { name: 'hoist', description: 'Display separately on member sidebar', type: 5, required: false },
            { name: 'mentionable', description: 'Allow anyone to mention this role', type: 5, required: false }
          ]
        },
        {
          name: 'permissions',
          description: 'Modify or inspect permissions on an existing role',
          type: 1,
          options: [
            { name: 'role', description: 'The role to modify permissions for', type: 8, required: true },
            {
              name: 'level',
              description: 'Permission level preset or custom',
              type: 3,
              required: true,
              choices: [
                { name: '👑 Admin (Full Administrator)', value: 'admin' },
                { name: '🛡️ Moderator (Kick, Ban, Mute, Delete Messages)', value: 'mod' },
                { name: '⚡ Support Staff (Manage Messages, Attach Files)', value: 'support' },
                { name: '👤 Verified Member / Customer (Standard Chat)', value: 'member' },
                { name: '👁️ Read Only (View Channels Only)', value: 'readonly' },
                { name: '⛔ None (0 Permissions / Reset)', value: 'none' }
              ]
            }
          ]
        },
        {
          name: 'give',
          description: 'Assign a role to a member',
          type: 1,
          options: [
            { name: 'user', description: 'Member to receive role', type: 6, required: true },
            { name: 'role', description: 'Role to assign', type: 8, required: true }
          ]
        },
        {
          name: 'remove',
          description: 'Remove a role from a member',
          type: 1,
          options: [
            { name: 'user', description: 'Member to remove role from', type: 6, required: true },
            { name: 'role', description: 'Role to remove', type: 8, required: true }
          ]
        },
        {
          name: 'delete',
          description: 'Permanently delete a role from the server',
          type: 1,
          options: [
            { name: 'role', description: 'Role to delete', type: 8, required: true }
          ]
        },
        {
          name: 'list',
          description: 'List all custom server roles and permissions',
          type: 1
        }
      ]
    },
    {
      name: 'autorole',
      description: 'Zen2K Auto-Role Engine (Auto-assigns roles to members)',
      type: 1,
      options: [
        {
          name: 'set',
          description: 'Set the automatic role granted to members',
          type: 1,
          options: [
            { name: 'role', description: 'The role to automatically grant', type: 8, required: true }
          ]
        },
        {
          name: 'check',
          description: 'Check currently configured auto-role settings',
          type: 1
        },
        {
          name: 'remove',
          description: 'Disable automatic role assignment',
          type: 1
        }
      ]
    },
    {
      name: 'setup-voice-panel',
      description: 'Deploy the Master Voice Control Panel (Channel 1549599836913803284)',
      type: 1,
      options: [
        { name: 'channel', description: 'Channel to deploy voice control panel to (default: 1549599836913803284)', type: 7, required: false }
      ]
    },
    {
      name: 'vc',
      description: 'Voice Room Controls (Lock, Unlock, Mute, Kick, Limit, Rename, Delete)',
      type: 1,
      options: [
        {
          name: 'create',
          description: 'Create your private squad voice channel',
          type: 1,
          options: [
            { name: 'name', description: 'Room name (e.g. 2s Park Grinding)', type: 3, required: false },
            { name: 'limit', description: 'Max player limit (0 for unlimited, 2-99)', type: 4, required: false }
          ]
        },
        {
          name: 'lock',
          description: 'Lock your temporary voice room from new members',
          type: 1
        },
        {
          name: 'unlock',
          description: 'Unlock your temporary voice room',
          type: 1
        },
        {
          name: 'mute',
          description: 'Mute / silence a member in your voice room',
          type: 1,
          options: [
            { name: 'user', description: 'Member to mute', type: 6, required: true }
          ]
        },
        {
          name: 'unmute',
          description: 'Unmute a member in your voice room',
          type: 1,
          options: [
            { name: 'user', description: 'Member to unmute', type: 6, required: true }
          ]
        },
        {
          name: 'kick',
          description: 'Disconnect a member from your voice room',
          type: 1,
          options: [
            { name: 'user', description: 'Member to disconnect', type: 6, required: true }
          ]
        },
        {
          name: 'limit',
          description: 'Change user limit on your voice room',
          type: 1,
          options: [
            { name: 'amount', description: 'User limit (0-99)', type: 4, required: true }
          ]
        },
        {
          name: 'rename',
          description: 'Rename your temporary voice room',
          type: 1,
          options: [
            { name: 'name', description: 'New voice channel name', type: 3, required: true }
          ]
        },
        {
          name: 'delete',
          description: 'Delete your temporary voice room when finished',
          type: 1
        }
      ]
    }
  ];

  try {
    // 1. Register to all joined Guilds for INSTANT zero-delay sync in Discord client
    const guildsRes = await fetch(DISCORD_API + '/users/@me/guilds', {
      headers: { 'Authorization': 'Bot ' + token }
    });
    const guildSyncResults = [];
    if (guildsRes.ok) {
      const guilds = await guildsRes.json().catch(() => []);
      for (const g of guilds) {
        const gRes = await fetch(DISCORD_API + '/applications/' + appId + '/guilds/' + g.id + '/commands', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bot ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(commands)
        });
        guildSyncResults.push(g.name + ' (' + g.id + '): ' + gRes.status);
      }
    }

    // 2. Register to Global Discord API
    const globalUrl = DISCORD_API + '/applications/' + appId + '/commands';
    const res = await fetch(globalUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bot ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    if (!res.ok) {
      const err = await res.text();
      return { status: res.status, data: { error: 'Discord API error: ' + err } };
    }

    const data = await res.json();

    // 🎛️ Auto-deploy Master Voice Control Panel to channel 1549599836913803284
    let voicePanelDeployed = false;
    const VOICE_PANEL_CHANNEL_ID = process.env.VOICE_PANEL_CHANNEL_ID || '1549599836913803284';
    try {
      const msgsRes = await fetch(DISCORD_API + '/channels/' + VOICE_PANEL_CHANNEL_ID + '/messages?limit=10', {
        headers: { 'Authorization': 'Bot ' + token }
      });
      const msgs = await msgsRes.json().catch(() => []);
      const hasPanel = Array.isArray(msgs) && msgs.some(m => m.embeds && m.embeds.some(e => e.title && e.title.includes('Zen2K Voice Room Control Center')));
      if (!hasPanel) {
        const vPayload = {
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
        const pRes = await fetch(DISCORD_API + '/channels/' + VOICE_PANEL_CHANNEL_ID + '/messages', {
          method: 'POST',
          headers: { 'Authorization': 'Bot ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(vPayload)
        });
        voicePanelDeployed = pRes.ok;
      } else {
        voicePanelDeployed = true;
      }
    } catch (_) {}

    return {
      status: 200,
      data: {
        success: true,
        message: 'Successfully registered ' + data.length + ' slash commands globally and to ' + guildSyncResults.length + ' guild(s)!',
        voice_panel_deployed: voicePanelDeployed,
        guilds: guildSyncResults,
        commands: data.map(c => '/' + c.name)
      }
    };
  } catch (e) {
    return { status: 500, data: { error: e.message } };
  }
}
