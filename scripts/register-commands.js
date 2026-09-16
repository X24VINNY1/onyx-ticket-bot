const DISCORD_API = 'https://discord.com/api/v10';

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !appId) {
  console.error('[!] Missing DISCORD_TOKEN or DISCORD_APP_ID in environment variables.');
  process.exit(1);
}

const commands = [
  {
    name: 'setup-tickets',
    description: 'Deploy the interactive ticket station panel in this channel',
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
  }
];

async function register() {
  const target = guildId ? ('guild ' + guildId) : 'Global Discord API';
  const url = guildId
    ? (DISCORD_API + '/applications/' + appId + '/guilds/' + guildId + '/commands')
    : (DISCORD_API + '/applications/' + appId + '/commands');

  console.log('[*] Registering commands to ' + target + '...');

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bot ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[-] Failed to register commands:', err);
    process.exit(1);
  }

  const data = await res.json();
  console.log('[+] Successfully registered ' + data.length + ' slash commands: ' + data.map(c => '/' + c.name).join(', '));
}

register();
