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
    description: 'Create a business pricing embed with an attached Order Ticket button (tickettool style)',
    type: 1,
    options: [
      { name: 'service', description: 'Product or Service Title (e.g. Discord Bot, FiveM Script)', type: 3, required: true },
      { name: 'price', description: 'Price tag (e.g. $25.00 or Starting at $15)', type: 3, required: true },
      { name: 'description', description: 'Overview description of what is included', type: 3, required: true },
      { name: 'features', description: 'Comma-separated features list (e.g. Fast Delivery, 24/7 Hosting, Admin Panel)', type: 3, required: false },
      { name: 'payment', description: 'Payment methods accepted (e.g. CashApp, PayPal, Crypto)', type: 3, required: false }
    ]
  },
  {
    name: 'ai-quote',
    description: 'AI-powered project price estimator that builds a formal quote embed with an Order button',
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
