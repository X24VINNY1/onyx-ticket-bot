import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions';

const DISCORD_API = 'https://discord.com/api/v10';

async function discordFetch(endpoint, options = {}) {
  const token = process.env.DISCORD_TOKEN;
  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Discord API Error [${endpoint}]:`, errText);
    throw new Error(`Discord API error: ${res.status} ${errText}`);
  }
  return res.json().catch(() => ({}));
}

async function processInteraction(interaction) {
  const { type, data, guild_id, member, channel_id } = interaction;
  const user = member?.user;

  // TYPE 1: PING
  if (type === InteractionType.PING) {
    return { type: InteractionResponseType.PONG };
  }

  // TYPE 2: APPLICATION COMMAND
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    if (name === 'setup-tickets') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '🎫 Support & Ticket Station',
            description: "Need assistance, have a billing question, or want to report a bug?\\nSelect a category from the menu below to open a private ticket with our staff.",
            color: 0x5865F2,
            fields: [
              {
                name: '⚡ Private & Secure',
                value: 'A dedicated channel will be created exclusively for you and the support staff.'
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
                    { label: 'General Support', value: 'general', description: 'General questions and server assistance', emoji: { name: '❓' } },
                    { label: 'Billing & Purchases', value: 'billing', description: 'Payment issues, upgrades, or store orders', emoji: { name: '💳' } },
                    { label: 'Bug Reports', value: 'bug', description: 'Found a defect, glitch, or security concern', emoji: { name: '🐛' } },
                    { label: 'Partnership & Inquiries', value: 'partner', description: 'Collaboration and business proposals', emoji: { name: '🤝' } },
                    { label: 'Custom Request', value: 'custom', description: 'Direct assistance or specialized services', emoji: { name: '⚡' } }
                  ]
                }
              ]
            }
          ]
        }
      };
    }

    if (name === 'channel') {
      const sub = options?.[0];
      const subName = sub?.name;
      const subOpts = sub?.options || [];

      if (subName === 'create') {
        const chName = subOpts.find(o => o.name === 'name')?.value || 'new-channel';
        const isVoice = subOpts.find(o => o.name === 'type')?.value === 'voice';

        try {
          const newCh = await discordFetch(`/guilds/${guild_id}/channels`, {
            method: 'POST',
            body: JSON.stringify({ name: chName, type: isVoice ? 2 : 0 })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `✅ Created ${isVoice ? 'voice' : 'text'} channel: <#${newCh.id}>` }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `❌ Failed to create channel: ${e.message}`, flags: 64 }
          };
        }
      }

      if (subName === 'delete') {
        try {
          await discordFetch(`/channels/${channel_id}`, { method: 'DELETE' });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🗑️ Channel deleted successfully.' }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `❌ Failed to delete channel: ${e.message}`, flags: 64 }
          };
        }
      }

      if (subName === 'purge') {
        const amount = subOpts.find(o => o.name === 'amount')?.value || 10;
        try {
          const msgs = await discordFetch(`/channels/${channel_id}/messages?limit=${Math.min(amount, 100)}`);
          if (Array.isArray(msgs) && msgs.length > 0) {
            const ids = msgs.map(m => m.id);
            await discordFetch(`/channels/${channel_id}/messages/bulk-delete`, {
              method: 'POST',
              body: JSON.stringify({ messages: ids })
            });
          }
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `🧹 Cleared ${amount} messages.`, flags: 64 }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `❌ Purge error: ${e.message}`, flags: 64 }
          };
        }
      }

      if (subName === 'lock') {
        try {
          await discordFetch(`/channels/${channel_id}/permissions/${guild_id}`, {
            method: 'PUT',
            body: JSON.stringify({ type: 0, deny: '2048' })
          });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `🔒 Channel <#${channel_id}> is now locked.` }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `❌ Error locking channel: ${e.message}`, flags: 64 }
          };
        }
      }

      if (subName === 'unlock') {
        try {
          await discordFetch(`/channels/${channel_id}/permissions/${guild_id}`, { method: 'DELETE' });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `🔓 Channel <#${channel_id}> is now unlocked.` }
          };
        } catch (e) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `❌ Error unlocking channel: ${e.message}`, flags: 64 }
          };
        }
      }
    }
  }

  // TYPE 3: MESSAGE COMPONENT
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id, values } = data;

    if (custom_id === 'ticket_category_select') {
      const selectedCat = values[0];
      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `modal_open_ticket_${selectedCat}`,
          title: 'Open Support Ticket',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'ticket_topic',
                  label: 'Topic / Brief Summary',
                  style: 1,
                  placeholder: 'e.g. Need help with billing or server rank',
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
                  label: 'Detailed Description',
                  style: 2,
                  placeholder: 'Describe your question or issue in detail...',
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
                  label: 'Priority (Low / Normal / High / Urgent)',
                  style: 1,
                  value: 'Normal',
                  required: false,
                  max_length: 20
                }
              ]
            }
          ]
        }
      };
    }

    if (custom_id === 'btn_close_ticket') {
      try {
        await discordFetch(`/channels/${channel_id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: '🔒 **Ticket closing. Channel will be deleted in 4 seconds...**' })
        });

        setTimeout(async () => {
          try {
            await discordFetch(`/channels/${channel_id}`, { method: 'DELETE' });
          } catch (err) {
            console.error('Delete channel error:', err);
          }
        }, 4000);

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `🔒 Closing confirmed by <@${user.id}>.` }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `❌ Error closing channel: ${e.message}`, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_claim_ticket') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '👤 Ticket Claimed',
            description: `This ticket has been claimed by <@${user.id}>. They will be handling your request from here.`,
            color: 0x23A55A
          }]
        }
      };
    }

    if (custom_id === 'btn_transcript_ticket') {
      try {
        const msgs = await discordFetch(`/channels/${channel_id}/messages?limit=100`);
        const messageList = Array.isArray(msgs) ? msgs.reverse() : [];
        const lines = messageList.map(m => `[${new Date(m.timestamp).toISOString()}] ${m.author.username}: ${m.content}`);
        const transcriptText = lines.join('\n');

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `📑 **Ticket Transcript Export (${messageList.length} messages):**
\`\`\`text
${transcriptText.slice(-1800)}
\`\`\``
          }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `❌ Failed to fetch transcript: ${e.message}`, flags: 64 }
        };
      }
    }
  }

  // TYPE 5: MODAL SUBMIT
  if (type === InteractionType.MODAL_SUBMIT) {
    const customId = data.custom_id;

    if (customId.startsWith('modal_open_ticket_')) {
      const category = customId.replace('modal_open_ticket_', '');
      const topic = data.components[0].components[0].value;
      const details = data.components[1].components[0].value;
      const priority = data.components[2]?.components[0]?.value || 'Normal';

      const ticketRandom = Math.floor(1000 + Math.random() * 9000);
      const chName = `ticket-${ticketRandom}-${category}`;

      try {
        const overwrites = [
          { id: guild_id, type: 0, deny: '1024' },
          { id: user.id, type: 1, allow: '68608' }
        ];

        const staffRoleId = process.env.STAFF_ROLE_ID;
        if (staffRoleId) {
          overwrites.push({ id: staffRoleId, type: 0, allow: '68608' });
        }

        const newChannel = await discordFetch(`/guilds/${guild_id}/channels`, {
          method: 'POST',
          body: JSON.stringify({
            name: chName,
            type: 0,
            permission_overwrites: overwrites,
            topic: `Ticket #${ticketRandom} | Opened by ${user.username} (${user.id}) | Category: ${category}`
          })
        });

        const staffPing = staffRoleId ? ` | <@&${staffRoleId}>` : '';
        await discordFetch(`/channels/${newChannel.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: `<@${user.id}>${staffPing}`,
            embeds: [{
              title: `🎫 Ticket #${ticketRandom} • ${category.toUpperCase()}`,
              description: `Welcome <@${user.id}>! Staff has been alerted and will assist you shortly.`,
              color: 0x5865F2,
              fields: [
                { name: '📌 Topic', value: topic, inline: false },
                { name: '📝 Details', value: details, inline: false },
                { name: '⚡ Priority', value: priority, inline: true },
                { name: '👤 Creator', value: `<@${user.id}>`, inline: true }
              ],
              footer: { text: 'Zen2K Ticket Suite • Made by officialZen2K' }
            }],
            components: [
              {
                type: 1,
                components: [
                  { type: 2, style: 4, label: 'Close Ticket', custom_id: 'btn_close_ticket', emoji: { name: '🔒' } },
                  { type: 2, style: 3, label: 'Claim', custom_id: 'btn_claim_ticket', emoji: { name: '👤' } },
                  { type: 2, style: 2, label: 'Transcript', custom_id: 'btn_transcript_ticket', emoji: { name: '📑' } }
                ]
              }
            ]
          })
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `✅ Your ticket has been created: <#${newChannel.id}>`, flags: 64 }
        };
      } catch (err) {
        console.error('Failed to create ticket channel:', err);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `❌ Failed to create ticket channel: ${err.message}`, flags: 64 }
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
