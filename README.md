# WhatsApp Message Bot

A Node.js bot that listens to WhatsApp group messages and sends them back as highlighted images to the same group. Inspired by the Telegram bot architecture but adapted for WhatsApp using the Twilio Cloud API.

## Features

- Receives messages from a WhatsApp group
- Generates images with messages highlighted in a visually appealing format
- Sends generated images back to the group
- Webhook-based integration with WhatsApp Cloud API
- Docker support for easy deployment
- TypeScript for type safety

## Requirements

- **WhatsApp Business Account** with access to the Cloud API
- **Twilio Account** (or another WhatsApp BSP) with phone number
- **Node.js 18+**
- **Docker** (optional, for containerized deployment)
- **Hosting with public URL** (required for webhook)

## Setup

### 1. Get WhatsApp API Credentials

#### Option A: Using Twilio (Recommended for beginners)

1. Sign up for a [Twilio account](https://www.twilio.com)
2. Go to "Messaging" > "Services" and create a new service
3. Add WhatsApp as a channel
4. Follow the setup wizard to connect your WhatsApp Business Account
5. Get your Account SID and Auth Token from the Twilio Console
6. Get your Twilio phone number (will be used as the bot sender)

#### Option B: Using WhatsApp Cloud API directly

1. Create a [Meta Business Account](https://business.facebook.com)
2. Request access to WhatsApp Business API
3. Create a Business App
4. Get your Phone Number ID and Business Account ID
5. Generate a temporary API token

### 2. Clone and Configure

```bash
git clone https://github.com/YOUR_USERNAME/whatsapp-message-bot.git
cd whatsapp-message-bot
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env
```

Fill in your `.env` file:

**For Twilio:**
```env
WHATSAPP_API_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+1234567890
WEBHOOK_URL=https://your-domain.com/webhook
VERIFY_TOKEN=your_random_verify_token
```

**For WhatsApp Cloud API:**
```env
WHATSAPP_API_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_API_TOKEN=your_api_token
WEBHOOK_URL=https://your-domain.com/webhook
VERIFY_TOKEN=your_random_verify_token
```

### 4. Run Locally

```bash
npm start
```

The bot will start listening on `http://localhost:3000`

### 5. Set Up Webhook

#### In Twilio Console:

1. Go to Messaging > Services > Your Service
2. Scroll to "Inbound Settings"
3. Set the webhook URL to `https://your-domain.com/webhook`
4. Save

#### In Meta/WhatsApp Console:

1. Go to App Settings > Webhooks
2. Set callback URL to `https://your-domain.com/webhook`
3. Set verify token to match your `VERIFY_TOKEN`
4. Subscribe to `messages` webhook events
5. Save

### 6. Get Public URL (for local development)

Use `ngrok` for tunneling:

```bash
ngrok http 3000
# Will output something like https://abc123.ngrok.io
# Use this as your WEBHOOK_URL
```

## Docker Deployment

### Build Image

```bash
docker build -t whatsapp-bot .
```

### Run Container

```bash
docker run -d \
  -e WHATSAPP_API_PROVIDER=twilio \
  -e TWILIO_ACCOUNT_SID=your_sid \
  -e TWILIO_AUTH_TOKEN=your_token \
  -e TWILIO_PHONE_NUMBER=whatsapp:+1234567890 \
  -e WEBHOOK_URL=https://your-domain.com \
  -e VERIFY_TOKEN=your_token \
  -p 3000:3000 \
  whatsapp-bot
```

Or use `docker-compose`:

```bash
docker-compose up -d
```

## Project Structure

```
whatsapp-message-bot/
├── src/
│   ├── main.ts              # Entry point
│   ├── config/
│   │   └── environment.ts   # Environment variable loading
│   ├── services/
│   │   ├── whatsapp.ts      # WhatsApp API service
│   │   └── imageGenerator.ts # Image generation logic
│   ├── handlers/
│   │   └── webhookHandler.ts # Webhook request handler
│   └── utils/
│       └── logger.ts        # Logging utilities
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

## How It Works

1. **Receives Webhook**: Bot receives incoming WhatsApp message via webhook
2. **Processes Message**: Extracts message content, sender name, and timestamp
3. **Generates Image**: Creates an image with the message highlighted using Canvas
4. **Sends Back**: Uploads the image and sends it to the same group
5. **Logs**: Records all interactions for debugging

## Architecture Differences from Telegram Bot

| Aspect | Telegram Bot | WhatsApp Bot |
|--------|--------------|-------------|
| **API Style** | Long polling | Webhook events |
| **Message Flow** | Group → Channel | Group → Group |
| **Library** | Grammy | Twilio SDK / Meta API |
| **Authentication** | Single token | Multiple credentials |
| **Deployment** | Polling always active | Event-driven |

## API Endpoints

### POST /webhook

Receives incoming messages from WhatsApp.

**Request body (Twilio):**
```json
{
  "MessageSid": "SM...",
  "AccountSid": "AC...",
  "From": "whatsapp:+1234567890",
  "To": "whatsapp:+0987654321",
  "Body": "Hello world"
}
```

### GET /webhook

Webhook verification endpoint.

**Query parameters:**
- `hub.challenge`: Verification string
- `hub.verify_token`: Token to verify

## Troubleshooting

### Bot not receiving messages
- Check webhook URL is publicly accessible
- Verify credentials in `.env` file
- Check webhook logs in Twilio/WhatsApp console
- Ensure verify token matches

### Images not generating
- Check Canvas library is installed: `npm list canvas`
- Verify file permissions for temp directory
- Check console logs for rendering errors

### Messages not sending back
- Verify WhatsApp Business Account is approved
- Check rate limits haven't been exceeded
- Verify recipient group ID is correct
- Check API token/credentials are valid

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run with hot reload
npm run dev

# Run tests
npm test
```

## License

UNLICENSED

## Resources

- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Canvas Library](https://github.com/Automattic/node-canvas)
- [Telegram Bot Reference](https://github.com/filipekiss/ooctechquestbot)
