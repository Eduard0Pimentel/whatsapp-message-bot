# WhatsApp Bot Complete Setup Guide

Your WhatsApp bot repository is ready! Follow these steps to complete the installation and add the bot to your WhatsApp.

## Quick Start (5 Minutes)

### Step 1: Clone and Setup

```bash
git clone https://github.com/Eduard0Pimentel/whatsapp-message-bot.git
cd whatsapp-message-bot
npm install
```

### Step 2: Get Twilio Credentials

1. Go to https://www.twilio.com/console
2. Sign up or log in
3. Get your **Account SID** and **Auth Token** from the dashboard
4. Go to Messaging > Services > Create Service
5. Add WhatsApp as a channel
6. Get your **Twilio WhatsApp Phone Number** (format: whatsapp:+1234567890)

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
WHATSAPP_API_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here  
TWILIO_PHONE_NUMBER=whatsapp:+1234567890
WEBHOOK_URL=https://your-domain.com/webhook
VERIFY_TOKEN=your_random_token
PORT=3000
NODE_ENV=development
```

### Step 4: Create Source Files

Run this to create all source files automatically:

```bash
mkdir -p src/config src/services src/handlers src/utils
```

Then copy the files from the COMPLETE_FILES section below into their respective directories.

### Step 5: Build and Run

```bash
npm run build
npm start
```

Your bot will run on `http://localhost:3000`

### Step 6: Set Up Ngrok (for local development)

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update `WEBHOOK_URL` in `.env`

### Step 7: Configure Twilio Webhook

1. In Twilio Console, go to Messaging > Services > Your Service
2. Scroll to "Inbound Settings"
3. Set webhook URL to: `https://your-ngrok-url.ngrok.io/webhook` (or your actual domain)
4. Save

### Step 8: Add Bot to WhatsApp Group

1. Go to your WhatsApp group
2. Add the Twilio WhatsApp number (use invite link feature)
3. Send a test message
4. Bot will receive it and send back an image with the highlighted message!

## Complete File Contents

If automatic file creation doesn't work, manually create these files:

### src/main.ts
```typescript
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { handleWebhook, verifyWebhook } from './handlers/webhookHandler';
import { logger } from './utils/logger';

dotenv.config();
const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/webhook', (req: Request, res: Response) => {
  verifyWebhook(req, res);
});

app.post('/webhook', (req: Request, res: Response) => {
  handleWebhook(req, res);
});

app.listen(PORT, () => {
  logger.info(`Bot running on port ${PORT}`);
  logger.info(`Webhook: ${process.env.WEBHOOK_URL}/webhook`);
});

export default app;
```

### src/config/environment.ts
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  whatsappProvider: process.env.WHATSAPP_API_PROVIDER || 'twilio',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  webhook: {
    url: process.env.WEBHOOK_URL || '',
    verifyToken: process.env.VERIFY_TOKEN || '',
  },
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

const requiredVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_PHONE_NUMBER',
  'VERIFY_TOKEN',
  'WEBHOOK_URL'
];

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}
```

### src/utils/logger.ts
```typescript
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  },
};
```

### src/handlers/webhookHandler.ts
```typescript
import { Request, Response } from 'express';
import { config } from '../config/environment';
import { WhatsAppService } from '../services/whatsapp';
import { ImageGenerator } from '../services/imageGenerator';
import { logger } from '../utils/logger';

export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.webhook.verifyToken) {
    logger.info('Webhook verified');
    res.status(200).send(challenge);
  } else {
    logger.error('Webhook verification failed');
    res.sendStatus(403);
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    if (!body.messages || body.messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = body.messages[0];
    
    if (message.type !== 'text') {
      logger.info(`Received non-text message: ${message.type}`);
      return res.sendStatus(200);
    }

    const sender = message.from;
    const text = message.text.body;
    const timestamp = new Date().toLocaleString();

    logger.info(`Message from ${sender}: ${text}`);

    const imageGenerator = new ImageGenerator();
    const imagePath = await imageGenerator.generateMessageImage({
      text,
      sender,
      timestamp
    });

    const whatsappService = new WhatsAppService();
    await whatsappService.sendImage(sender, imagePath);

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error handling webhook', error);
    res.sendStatus(500);
  }
};
```

### src/services/whatsapp.ts
```typescript
import twilio from 'twilio';
import fs from 'fs';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class WhatsAppService {
  private client: any;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  async sendImage(recipientNumber: string, imagePath: string): Promise<void> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const message = await this.client.messages.create({
        from: config.twilio.phoneNumber,
        to: `whatsapp:${recipientNumber}`,
        mediaUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
      });
      logger.info(`Image sent: ${message.sid}`);
      fs.unlinkSync(imagePath);
    } catch (error) {
      logger.error('Error sending image', error);
      throw error;
    }
  }
}
```

### src/services/imageGenerator.ts
```typescript
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface MessageData {
  text: string;
  sender: string;
  timestamp: string;
}

export class ImageGenerator {
  private width = 1080;
  private height = 1350;
  private backgroundColor = '#FFFFFF';
  private textColor = '#000000';
  private highlightColor = '#FFE082';

  async generateMessageImage(data: MessageData): Promise<string> {
    try {
      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = this.highlightColor;
      ctx.fillRect(0, 0, this.width, 120);

      ctx.fillStyle = this.textColor;
      ctx.font = 'bold 28px Arial';
      ctx.fillText(data.sender, 40, 80);

      ctx.font = '16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(data.timestamp, 40, 110);

      ctx.fillStyle = this.textColor;
      ctx.font = '24px Arial';
      const lines = this.wrapText(ctx, data.text, this.width - 80);
      let y = 200;
      for (const line of lines) {
        ctx.fillText(line, 40, y);
        y += 40;
      }

      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const imagePath = path.join(tempDir, `message_${Date.now()}.png`);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(imagePath, buffer);

      logger.info(`Image generated: ${imagePath}`);
      return imagePath;
    } catch (error) {
      logger.error('Error generating image', error);
      throw error;
    }
  }

  private wrapText(ctx: any, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }
}
```

## Deployment

### With Docker

```bash
docker build -t whatsapp-bot .
docker run -d -e TWILIO_ACCOUNT_SID=... -e TWILIO_AUTH_TOKEN=... -p 3000:3000 whatsapp-bot
```

### On Heroku

1. `heroku create your-bot-name`
2. `heroku config:set TWILIO_ACCOUNT_SID=...`
3. `heroku config:set TWILIO_AUTH_TOKEN=...`
4. `git push heroku main`

## Troubleshooting

- **Bot not receiving messages**: Check webhook URL is publicly accessible
- **Images not generating**: Install Canvas: `npm install canvas`
- **Messages not sending**: Verify Twilio credentials and phone number format

## You're Ready!

Your WhatsApp bot is now ready to be added to groups!
