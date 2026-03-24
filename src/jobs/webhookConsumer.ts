/**
 * Consumes WEBHOOKS queue: deliver outbound webhooks with HMAC-SHA256 signature and retries.
 */
import type { ConsumeMessage } from "amqplib";
import { connectRabbitMQ, QUEUES } from "../config/rabbitmq";
import { logger } from "../config/logger";
import { deliverWebhook } from "../services/webhook";

interface WebhookJobPayload {
  webhookId: string;
}

export async function startWebhookConsumer(): Promise<void> {
  const ch = await connectRabbitMQ();
  await ch.assertQueue(QUEUES.WEBHOOKS, { durable: true });
  ch.prefetch(1);
  ch.consume(
    QUEUES.WEBHOOKS,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const body = JSON.parse(msg.content.toString()) as WebhookJobPayload;
        const { webhookId } = body;
        if (!webhookId) {
          ch.ack(msg);
          return;
        }
        const ok = await deliverWebhook(webhookId);
        if (ok) {
          ch.ack(msg);
        } else {
          ch.nack(msg, false, true);
        }
      } catch (e) {
        logger.error("Webhook consumer error", { error: e });
        ch.nack(msg, false, true);
      }
    },
    { noAck: false },
  );
  logger.info("Webhook consumer started", { queue: QUEUES.WEBHOOKS });
}
