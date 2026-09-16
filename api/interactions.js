import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions';

const DISCORD_API = 'https://discord.com/api/v10';
const TICKETS_CATEGORY_ID = process.env.TICKETS_CATEGORY_ID || '1529702797082365962';
const TRANSCRIPTS_CHANNEL_ID = process.env.TRANSCRIPTS_CHANNEL_ID || '1529702818796015718';

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

// Archive ticket transcript to the designated transcripts channel
async function archiveTicketTranscript(channelId, closedByUserId, closedByUsername) {
  try {
    const ch = await discordFetch('/channels/' + channelId).catch(() => ({}));
    const chName = ch.name || 'ticket-' + channelId;
    const topic = ch.topic || 'Zen2K Service Order';

    const msgs = await discordFetch('/channels/' + channelId + '/messages?limit=100').catch(() => []);
    const messageList = Array.isArray(msgs) ? msgs.reverse() : [];

    const lines = messageList.map(m => {
      const time = new Date(m.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const author = m.author ? (m.author.username || m.author.id) : 'Unknown';
      const content = m.content || (m.embeds?.length ? '[Embed: ' + (m.embeds[0].title || 'card') + ']' : '[Attachment/Component]');
      return `[${time}] ${author}: ${content}`;
    });
    const logText = lines.join('\n');

    const clientMatch = topic.match(/\((\d{17,20})\)/) || topic.match(/Client:\s*(\S+)/);
    const clientInfo = clientMatch ? clientMatch[1] : 'Unknown Client';

    const transcriptsChId = TRANSCRIPTS_CHANNEL_ID;
    await discordFetch('/channels/' + transcriptsChId + '/messages', {
      method: 'POST',
      body: JSON.stringify({
        embeds: [{
          title: '📑 TICKET ARCHIVED • #' + chName,
          description: '>>> 👤 **Client:** ' + (clientInfo.startsWith('<@') ? clientInfo : (isNaN(clientInfo) ? clientInfo : '<@' + clientInfo + '>')) + '\n' +
            '🔒 **Closed By:** <@' + closedByUserId + '> (`' + closedByUsername + '`)\n' +
            '📌 **Channel Topic:** `' + topic.slice(0, 100) + '`\n' +
            '💬 **Total Messages:** `' + messageList.length + '`\n' +
            '🕒 **Archived At:** <t:' + Math.floor(Date.now() / 1000) + ':F>',
          color: 0x5865F2,
          fields: [
            {
              name: '📜 Transcript Log',
              value: '```text\n' + (logText.slice(-950) || 'No conversation logged.') + '\n```',
              inline: false
            }
          ],
          footer: { text: 'Zen2K Automated Vault • officialZen2K' }
        }]
      })
    });
    return true;
  } catch (err) {
    console.error('Failed to archive ticket transcript:', err);
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
    description: '>>> 👑 **Client:** ' + (clientId ? '<@' + clientId + '>' : clientTag) + '\n📦 **Service:** `' + serviceName + '`' + (tierName ? '\n💎 **Package:** `' + tierName + '`' : '') + '\n🕒 **Estimated Delivery:** `15 - 30 Minutes`',
    color: step === 4 ? 0x57F287 : (step >= 2 ? 0x5865F2 : 0xFEE75C),
    fields: [
      {
        name: '📊 REAL-TIME ORDER PROGRESS',
        value: '```\n' + current.bar + ' ' + current.percent + ' — ' + current.title + '\n```\n' + current.desc,
        inline: false
      },
      {
        name: '📋 CLIENT INSTRUCTIONS',
        value: '1️⃣ Send your platform (PSN / XBOX / PC) and credentials below.\n2️⃣ Provide 2FA backup codes if enabled to expedite delivery.\n3️⃣ Do **NOT** log in while progress shows `IN DELIVERY`.',
        inline: false
      }
    ],
    footer: { text: 'Zen2K Order Engine • Handled by ' + staffInfo + ' • Made by officialZen2K' }
  };

  if (step === 4) {
    embed.image = { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' };
  }

  return embed;
}

// Build progress buttons inside the ticket
function buildProgressButtons(currentStep = 1) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: currentStep === 2 ? 3 : 1, label: 'Confirm Payment', custom_id: 'btn_prog_2', emoji: { name: '💳' } },
        { type: 2, style: currentStep === 3 ? 3 : 1, label: 'In Delivery', custom_id: 'btn_prog_3', emoji: { name: '⚙️' } },
        { type: 2, style: currentStep === 4 ? 3 : 3, label: 'Complete Order', custom_id: 'btn_prog_4', emoji: { name: '🏆' } }
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
      const bannerUrl = 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif';
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '⚡ Zen2K Support & Ticket Station',
            description: '>>> **Welcome to the official Zen2K Service Portal!**\n\nNeed instant delivery, custom development, billing help, or have a question?\nSelect a service category below to open a private encrypted channel with staff.',
            color: 0x5865F2,
            image: { url: bannerUrl },
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
          // If this is a ticket/order channel, auto-archive to transcripts vault
          archiveTicketTranscript(channel_id, user.id, user.username).catch(() => {});

          await discordFetch('/channels/' + channel_id, { method: 'DELETE' });
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🗑️ Channel deleted successfully. Transcript saved to <#' + TRANSCRIPTS_CHANNEL_ID + '>.' }
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

    // Vouches Button
    if (custom_id === 'btn_view_reviews') {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          embeds: [{
            title: '⭐ Zen2K Verified Customer Reviews',
            description: '>>> **Trust Score: 4.98 / 5.0 (340+ Orders Delivered)**\n\n' +
              '⭐ ⭐ ⭐ ⭐ ⭐\n' +
              '💬 *"Delivered 900k VC on my console in under 15 minutes, 100% legit."* — `@kyro`\n\n' +
              '⭐ ⭐ ⭐ ⭐ ⭐\n' +
              '💬 *"Vouch for Zen2K! Ban-proof, fast communication, legit seller."* — `@dante`\n\n' +
              '⭐ ⭐ ⭐ ⭐ ⭐\n' +
              '💬 *"Second time buying, got the 1.4M VC pack. Done super fast."* — `@jordan`\n\n' +
              '✅ All transactions protected with direct staff verification & warranty.',
            color: 0xFEE75C,
            footer: { text: 'Zen2K Verified Merchant • officialZen2K' }
          }]
        }
      };
    }

    // Category Select on /setup-tickets
    if (custom_id === 'ticket_category_select') {
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

        // CREATE CHANNEL UNDER OPEN TICKETS CATEGORY (1529702797082365962)
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
      if (targetStep === 2) {
        notifyText = '💳 **Payment Confirmed!** Verified by <@' + user.id + '>. Order is now in the fulfillment queue!';
      } else if (targetStep === 3) {
        notifyText = '⚡ **In Delivery!** <@' + (clientId || user.id) + '> Work has begun on your account. Please stay logged out of your game.';
      } else if (targetStep === 4) {
        notifyText = '🎉 <@' + (clientId || user.id) + '> **Order Completed!** Your delivery is ready. Thank you for doing business with Zen2K!';
      }

      if (notifyText) {
        discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify({ content: notifyText })
        }).catch(() => {});
      }

      return {
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          embeds: [updatedEmbed],
          components: updatedButtons
        }
      };
    }

    // Close Ticket -> Archive to TRANSCRIPTS_CHANNEL_ID and delete channel
    if (custom_id === 'btn_close_ticket') {
      try {
        // Post closing warning in the ticket channel
        await discordFetch('/channels/' + channel_id + '/messages', {
          method: 'POST',
          body: JSON.stringify({
            embeds: [{
              title: '🔒 Ticket Closed',
              description: 'Ticket closed by <@' + user.id + '>.\nArchiving transcript to <#' + TRANSCRIPTS_CHANNEL_ID + '> and deleting channel in 5 seconds...',
              color: 0xED4245
            }]
          })
        });

        // Trigger asynchronous archival to the transcripts vault
        archiveTicketTranscript(channel_id, user.id, user.username).catch(e => console.error('Archive error:', e));

        // Delete channel after 5s countdown
        setTimeout(async () => {
          try {
            await discordFetch('/channels/' + channel_id, { method: 'DELETE' });
          } catch (err) {
            console.error('Delete channel error:', err);
          }
        }, 5000);

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '🔒 Close confirmed. Transcript will be sent to <#' + TRANSCRIPTS_CHANNEL_ID + '>.' }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Error closing channel: ' + e.message, flags: 64 }
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

    // Save Transcript manually to transcripts channel
    if (custom_id === 'btn_transcript_ticket') {
      try {
        await archiveTicketTranscript(channel_id, user.id, user.username);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '📑 **Transcript Saved!** Successfully exported to <#' + TRANSCRIPTS_CHANNEL_ID + '>.',
            flags: 64
          }
        };
      } catch (e) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Failed to export transcript: ' + e.message, flags: 64 }
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
