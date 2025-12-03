import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { whatsappService } from '../services/whatsapp';
import { imageGenerator } from '../services/imageGenerator';

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'test_token';

export async function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.error('Webhook verification failed');
    res.sendStatus(403);
  }
}

export async function handleWebhookEvent(req: Request, res: Response) {
  const body = req.body;

  if (body.object !== 'whatsapp_business_account') {
    res.sendStatus(404);
    return;
  }

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') {
          continue;
        }

        const messages = change.value.messages || [];
        const metadata = change.value.metadata || {};

        for (const message of messages) {
          if (message.type !== 'text') {
            logger.warn('Skipping non-text message:', message.type);
            continue;
          }

          const senderPhoneNumber = message.from;
          const messageText = message.text.body;
          const groupId = metadata.phone_number_id;

          logger.info(`Received message from ${senderPhoneNumber}: ${messageText}`);

          const imageBuffer = await imageGenerator.generateMessageImage(messageText);

          await whatsappService.sendImage(
            groupId,
            imageBuffer,
            'message_highlight.png'
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
}
