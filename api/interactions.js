import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions';

const DISCORD_API = 'https://discord.com/api/v10';

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
  if (lower.includes('fivem') || lower.includes('lua') || lower.includes('game') || lower.includes('roblox')) {
    baseMin += 20;
    baseMax += 40;
    scopeItems.push('Custom Game Engine Scripting & Optimization');
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

  scopeItems.push('End-to-End Testing & Verification');
  scopeItems.push('Direct Setup Assistance & 7-Day Warranty');

  let priceString = '$' + baseMin + ' - $' + baseMax + ' USD';
  if (budget) {
    priceString += ' (Targeted around client budget: ' + budget + ')';
  }

  return {
    price: priceString,
    timeline,
    scope: scopeItems
  };
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

    // --- /setup-tickets ---
    if (name === 'setup-tickets') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '🎫 Support & Ticket Station',
            description: 'Need assistance, have a billing question, or want to order a service?\nSelect a category from the menu below to open a private ticket with our staff.',
            color: 0x5865F2,
            fields: [
              {
                name: '⚡ Private & Secure',
                value: 'A dedicated channel will be created exclusively for you and the business staff.'
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
                    { label: 'Order a Service', value: 'order', description: 'Place a new business order or custom build', emoji: { name: '🛒' } },
                    { label: 'Billing & Purchases', value: 'billing', description: 'Payment issues, upgrades, or invoice help', emoji: { name: '💳' } },
                    { label: 'Bug Reports', value: 'bug', description: 'Found a defect, glitch, or security concern', emoji: { name: '🐛' } },
                    { label: 'Custom Commission', value: 'custom', description: 'Direct high-tier custom development', emoji: { name: '⚡' } }
                  ]
                }
              ]
            }
          ]
        }
      };
    }

    // --- /pricing-create (TicketTool style pricing panel) ---
    if (name === 'pricing-create') {
      const serviceName = options.find(o => o.name === 'service')?.value || 'Custom Service';
      const price = options.find(o => o.name === 'price')?.value || 'Inquire';
      const desc = options.find(o => o.name === 'description')?.value || 'High quality service delivered fast.';
      const rawFeatures = options.find(o => o.name === 'features')?.value || 'Fast Delivery, 24/7 Support, Full Source Code';
      const payment = options.find(o => o.name === 'payment')?.value || 'PayPal, CashApp, Crypto, Apple Pay';

      const featureList = rawFeatures.split(',').map(f => '✅ ' + f.trim()).join('\n');

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '📦 ' + serviceName + ' • Pricing & Ordering',
            description: desc + '\n\n**💰 Price / Investment:** `' + price + '`',
            color: 0x57F287,
            fields: [
              { name: '📋 What is Included', value: featureList || '✅ Full Delivery', inline: false },
              { name: '💳 Accepted Payment Methods', value: payment, inline: false }
            ],
            footer: { text: 'Zen2K Business • Click below to open an order ticket' }
          }],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3, // Green
                  label: 'Order ' + serviceName.slice(0, 50),
                  custom_id: 'btn_order_pkg_' + serviceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30),
                  emoji: { name: '🛒' }
                },
                {
                  type: 2,
                  style: 2, // Secondary
                  label: 'Ask Questions',
                  custom_id: 'btn_order_inquire',
                  emoji: { name: '❓' }
                }
              ]
            }
          ]
        }
      };
    }

    // --- /ai-quote (Automated AI Pricing Breakdown) ---
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
  }

  // TYPE 3: MESSAGE COMPONENT
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id, values } = data;

    if (custom_id === 'ticket_category_select') {
      const selectedCat = values[0];
      return {
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'modal_open_ticket_' + selectedCat,
          title: 'Open Support / Order Ticket',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'ticket_topic',
                  label: 'Subject / Service Required',
                  style: 1,
                  placeholder: 'e.g. Discord Bot, FiveM Script, Custom Build',
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
                  label: 'Project Details & Specifications',
                  style: 2,
                  placeholder: 'Describe what you need, any deadlines, and your budget...',
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
                  label: 'Delivery Priority (Normal / Rush / Urgent)',
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

    if (custom_id.startsWith('btn_order_pkg_') || custom_id === 'btn_order_inquire' || custom_id === 'btn_quote_accept') {
      const isQuote = custom_id === 'btn_quote_accept';
      const isQuestion = custom_id === 'btn_order_inquire';
      let serviceLabel = 'Order';
      if (custom_id.startsWith('btn_order_pkg_')) {
        serviceLabel = custom_id.replace('btn_order_pkg_', '').replace(/_/g, ' ');
      } else if (isQuote) {
        serviceLabel = 'AI Quote';
      } else if (isQuestion) {
        serviceLabel = 'Inquiry';
      }

      const ticketRandom = Math.floor(1000 + Math.random() * 9000);
      const chName = 'order-' + ticketRandom + '-' + user.username.slice(0, 10).toLowerCase();

      try {
        const overwrites = [
          { id: guild_id, type: 0, deny: '1024' },
          { id: user.id, type: 1, allow: '68608' }
        ];

        const staffRoleId = process.env.STAFF_ROLE_ID;
        if (staffRoleId) {
          overwrites.push({ id: staffRoleId, type: 0, allow: '68608' });
        }

        const newChannel = await discordFetch('/guilds/' + guild_id + '/channels', {
          method: 'POST',
          body: JSON.stringify({
            name: chName,
            type: 0,
            permission_overwrites: overwrites,
            topic: 'Order Ticket #' + ticketRandom + ' | Client: ' + user.username + ' (' + user.id + ') | Package: ' + serviceLabel
          })
        });

        const staffPing = staffRoleId ? (' | <@&' + staffRoleId + '>') : '';
        await discordFetch('/channels/' + newChannel.id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            content: '<@' + user.id + '>' + staffPing,
            embeds: [{
              title: '🛒 Order Ticket #' + ticketRandom + ' • ' + serviceLabel.toUpperCase(),
              description: 'Welcome <@' + user.id + '>! You opened an order ticket for **' + serviceLabel + '**.\nOur business staff has been alerted and will finalize your details and invoice shortly.',
              color: 0x57F287,
              fields: [
                { name: '👤 Client', value: '<@' + user.id + '> (`' + user.username + '`)', inline: true },
                { name: '📦 Selected Service', value: serviceLabel, inline: true },
                { name: '💳 Order Status', value: '⏳ **Pending Payment / Specifications**', inline: false }
              ],
              footer: { text: 'Zen2K Business Ticket System • Made by officialZen2K' }
            }],
            components: [
              {
                type: 1,
                components: [
                  { type: 2, style: 4, label: 'Close Ticket', custom_id: 'btn_close_ticket', emoji: { name: '🔒' } },
                  { type: 2, style: 3, label: 'Claim Order', custom_id: 'btn_claim_ticket', emoji: { name: '👤' } },
                  { type: 2, style: 1, label: 'Mark as Paid', custom_id: 'btn_mark_paid', emoji: { name: '💳' } },
                  { type: 2, style: 2, label: 'Transcript', custom_id: 'btn_transcript_ticket', emoji: { name: '📑' } }
                ]
              }
            ]
          })
        });

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ Your order ticket has been created: <#' + newChannel.id + '>', flags: 64 }
        };
      } catch (err) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to open order ticket: ' + err.message, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_mark_paid') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '💳 Payment Confirmed',
            description: 'This order has been marked as **PAID** by <@' + user.id + '>. Work is now officially in progress!',
            color: 0x23A55A
          }]
        }
      };
    }

    if (custom_id === 'btn_close_ticket') {
      try {
        await discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify({ content: '🔒 **Ticket closing. Channel will be deleted in 4 seconds...**' })
        });

        setTimeout(async () => {
          try {
            await discordFetch('/channels/' + channel_id, { method: 'DELETE' });
          } catch (err) {
            console.error('Delete channel error:', err);
          }
        }, 4000);

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔒 Closing confirmed by <@' + user.id + '>.' }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Error closing channel: ' + e.message, flags: 64 }
        };
      }
    }

    if (custom_id === 'btn_claim_ticket') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '👤 Ticket Claimed',
            description: 'This ticket has been claimed by <@' + user.id + '>. They will be handling your request from here.',
            color: 0x23A55A
          }]
        }
      };
    }

    if (custom_id === 'btn_transcript_ticket') {
      try {
        const msgs = await discordFetch('/channels/' + channel_id + '/messages?limit=100');
        const messageList = Array.isArray(msgs) ? msgs.reverse() : [];
        const lines = messageList.map(m => '[' + new Date(m.timestamp).toISOString() + '] ' + m.author.username + ': ' + m.content);
        const transcriptText = lines.join('\n');

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '📑 **Ticket Transcript Export (' + messageList.length + ' messages):**\n```text\n' + transcriptText.slice(-1800) + '\n```'
          }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to fetch transcript: ' + e.message, flags: 64 }
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
      const chName = 'ticket-' + ticketRandom + '-' + category;

      try {
        const overwrites = [
          { id: guild_id, type: 0, deny: '1024' },
          { id: user.id, type: 1, allow: '68608' }
        ];

        const staffRoleId = process.env.STAFF_ROLE_ID;
        if (staffRoleId) {
          overwrites.push({ id: staffRoleId, type: 0, allow: '68608' });
        }

        const newChannel = await discordFetch('/guilds/' + guild_id + '/channels', {
          method: 'POST',
          body: JSON.stringify({
            name: chName,
            type: 0,
            permission_overwrites: overwrites,
            topic: 'Ticket #' + ticketRandom + ' | Opened by ' + user.username + ' (' + user.id + ') | Category: ' + category
          })
        });

        const staffPing = staffRoleId ? (' | <@&' + staffRoleId + '>') : '';
        await discordFetch('/channels/' + newChannel.id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            content: '<@' + user.id + '>' + staffPing,
            embeds: [{
              title: '🎫 Ticket #' + ticketRandom + ' • ' + category.toUpperCase(),
              description: 'Welcome <@' + user.id + '>! Staff has been alerted and will assist you shortly.',
              color: 0x5865F2,
              fields: [
                { name: '📌 Topic', value: topic, inline: false },
                { name: '📝 Details', value: details, inline: false },
                { name: '⚡ Priority', value: priority, inline: true },
                { name: '👤 Creator', value: '<@' + user.id + '>', inline: true }
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
          data: { content: '✅ Your ticket has been created: <#' + newChannel.id + '>', flags: 64 }
        };
      } catch (err) {
        console.error('Failed to create ticket channel:', err);
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
