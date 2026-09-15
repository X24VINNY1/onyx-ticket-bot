# Onyx Discord Ticket & Server Suite (Vercel Serverless + Standalone)

An advanced Discord Ticket & Server Management Bot engineered for 100% serverless 24/7 hosting on Vercel via Discord HTTP Interactions, paired with an optional standalone desktop engine.

---

## Architecture & Hosting on Vercel

Traditional Discord bots require persistent WebSocket connections that die when serverless containers freeze. **Onyx runs completely serverless** using Discord's official **HTTP Interactions Endpoint API**:
- **Zero Idle Costs**: Runs on Vercel's free tier 24/7.
- **Instant Response**: Discord sends cryptographic Ed25519-signed HTTPS POST requests directly to your /api/interactions endpoint.
- **No Gateway Required**: Channels, tickets, embeds, buttons, and permissions are managed directly through Discord's REST API.

---

## Deploying to Vercel (3 Steps)

### Step 1: Import to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import your GitHub repository: onyx-ticket-bot.
3. In **Environment Variables**, add the following:
   - DISCORD_TOKEN: Your bot token from the Discord Developer Portal.
   - DISCORD_PUBLIC_KEY: Your application's Public Key (under General Information).
   - DISCORD_APP_ID: Your Application ID.
   - STAFF_ROLE_ID: (Optional) ID of your server support staff role.
   - DISCORD_GUILD_ID: (Optional) Server ID for instant command updates.
4. Click **Deploy**.

### Step 2: Set Discord Interactions Endpoint URL
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) -> select your application.
2. In the **General Information** tab, find **Interactions Endpoint URL**.
3. Paste your Vercel URL with /api/interactions:
   `	ext
   https://your-project-name.vercel.app/api/interactions
   `
4. Click **Save Changes**. Discord will ping your endpoint; Vercel will verify the signature and return PONG (HTTP 200).

### Step 3: Register Slash Commands
Run the command registration script locally with your bot token and application ID:
`ash
node scripts/register-commands.js
`

---

## How It Works in Discord

1. **Deploy Ticket Station**:
   - Type /setup-tickets in any channel to drop the interactive ticket station.
2. **User Opens a Ticket**:
   - The user selects a category from the dropdown (General Support, Billing, Bug Reports, Partnerships, Custom).
   - A Discord modal pops up asking for topic, detailed issue description, and priority level.
   - The bot creates a private channel (e.g. #ticket-4821-billing) and configures permission overwrites so only the user and staff can see it.
   - The welcome embed is posted with action buttons:
     - Close Ticket: Confirms closure and deletes channel after countdown.
     - Claim Ticket: Staff claims ownership of the ticket.
     - Transcript: Compiles message history and exports transcript.
3. **Channel Management**:
   - /channel create <name> [type]: Creates text or voice channel.
   - /channel delete: Deletes channel.
   - /channel purge <amount>: Cleans up messages in bulk.
   - /channel lock & /channel unlock: Toggles lockdown for standard members.

---

## Repository Contents

`	ext
onyx-ticket-bot/
├── api/
│   └── interactions.js     # Vercel Serverless Core (Ed25519 signature verification & Discord REST)
├── public/
│   └── index.html          # Web Dashboard & Setup Assistant
├── scripts/
│   └── register-commands.js # Slash command synchronizer
├── vercel.json             # Vercel routing & rewrites configuration
├── package.json            # Node.js dependencies (discord-interactions)
├── .env.example            # Environment variables reference
└── python_standalone/      # Optional local Python desktop dashboard & discord.py engine
    ├── bot.py
    ├── gui.py (PyQt6)
    ├── database.py (SQLite)
    ├── transcripts.py
    └── views.py
`
