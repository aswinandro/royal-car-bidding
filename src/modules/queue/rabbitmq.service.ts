// src/modules/queue/rabbitmq.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
    await this.setupQueues();
  }

  private async connect() {
    const rabbitmqUrl = this.configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
    
    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();

    // Handle connection errors
    this.connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    this.connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
    });
  }

  private async setupQueues() {
    // Bid processing queue
    await this.channel.assertQueue('bid.processing', {
      durable: true,
      messageTtl: 300000, // 5 minutes
      arguments: {
        'x-dead-letter-exchange': 'bid.dlx',
        'x-dead-letter-routing-key': 'failed',
      },
    });

    // Notification queue
    await this.channel.assertQueue('notifications', {
      durable: true,
    });

    // Audit queue
    await this.channel.assertQueue('audit.logs', {
      durable: true,
    });

    // Dead letter queue
    await this.channel.assertExchange('bid.dlx', 'direct', { durable: true });
    await this.channel.assertQueue('bid.failed', { durable: true });
    await this.channel.bindQueue('bid.failed', 'bid.dlx', 'failed');

    // Set up consumers
    this.setupConsumers();
  }

  private async setupConsumers() {
    // Bid processing consumer
    await this.channel.consume('bid.processing', async (msg) => {
      if (msg) {
        try {
          const bidEvent = JSON.parse(msg.content.toString());
          await this.processBidEvent(bidEvent);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Error processing bid event:', error);
          this.channel.nack(msg, false, false); // Send to DLQ
        }
      }
    });

    // Notification consumer
    await this.channel.consume('notifications', async (msg) => {
      if (msg) {
        try {
          const notification = JSON.parse(msg.content.toString());
          await this.processNotification(notification);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Error processing notification:', error);
          this.channel.nack(msg, false, true); // Requeue
        }
      }
    });
  }

  async publishBidEvent(bidEvent: any) {
    const message = Buffer.from(JSON.stringify(bidEvent));
    await this.channel.sendToQueue('bid.processing', message, {
      persistent: true,
      priority: 1,
    });
  }

  async publishNotification(notification: any) {
    const message = Buffer.from(JSON.stringify(notification));
    await this.channel.sendToQueue('notifications', message, {
      persistent: true,
    });
  }

  async publishAuditLog(auditData: any) {
    const message = Buffer.from(JSON.stringify(auditData));
    await this.channel.sendToQueue('audit.logs', message, {
      persistent: true,
    });
  }

  private async processBidEvent(bidEvent: any) {
    // Process bid event (e.g., send emails, update analytics, etc.)
    console.log('Processing bid event:', bidEvent);
    
    // Log audit trail
    await this.publishAuditLog({
      action: 'BID_PLACED',
      auctionId: bidEvent.auctionId,
      userId: bidEvent.userId,
      amount: bidEvent.amount,
      timestamp: bidEvent.timestamp,
    });
  }

  private async processNotification(notification: any) {
    // Process notification (e.g., send push notifications, emails, etc.)
    console.log('Processing notification:', notification);
  }
}