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
