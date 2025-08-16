import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { IEmailJobPayload } from './interfaces/email.interface';
import { EmailStatusEnum } from './model/email.status.enum';

@Injectable()
export class EmailQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueue.name);
  private connection: Redis;
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly cfg: ConfigService,
    @Inject(forwardRef(() => EmailService)) private readonly emailService: EmailService,
  ) { }

  onModuleInit() {
    this.setupRedis();
    this.setupQueue();
    this.setupWorker();
    this.setupQueueEvents();
    this.setupSMTP();
  }

  onModuleDestroy() {
    this.queue?.close();
    this.worker?.close();
    this.queueEvents?.close();
    this.connection?.quit();
  }

  public get bullQueue(): Queue {
    return this.queue;
  }

  private setupRedis() {
    const redisUrl = this.cfg.get<string>('REDIS_URL');
    if (redisUrl && redisUrl.trim() !== '') {
      this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    } else {
      const host = this.cfg.get<string>('REDIS_HOST') ?? 'localhost';
      const port = Number(this.cfg.get<string>('REDIS_PORT') ?? 6379);
      const password = this.cfg.get<string>('REDIS_PASSWORD') || undefined;
      this.connection = new Redis(port, host, { password, maxRetriesPerRequest: null });
    }
    this.connection.on('connect', () => this.logger.log('Redis connected'));
    this.connection.on('error', (e) => this.logger.error('Redis error', e));
  }

  private setupQueue() {
    this.queue = new Queue('email', { connection: this.connection });
  }

  private setupWorker() {
    this.worker = new Worker(
      'email',
      async (job) => {
        this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);
        await this.sendEmail(job.data);
        return { status: 'sent' };
      },
      { connection: this.connection, concurrency: 5 },
    );

    this.worker.on('completed', async (job) => {
      if (job?.id) {
        await this.emailService.updateLogStatus(job.id.toString(), EmailStatusEnum.sent);
      } else {
        this.logger.warn('Completed job has undefined id');
      }
    });

    this.worker.on('failed', async (job, err) => {
      if (job?.id) {
        await this.emailService.updateLogStatus(job.id.toString(), EmailStatusEnum.failed, err?.message ?? 'Unknown error');
      } else {
        this.logger.warn('Failed job has undefined id', err);
      }
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`);
    });
  }

  private setupQueueEvents() {
    this.queueEvents = new QueueEvents('email', { connection: this.connection });
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.warn(`Queue event: job ${jobId} failed – ${failedReason}`);
    });
  }

  private setupSMTP() {
    this.transporter = nodemailer.createTransport({
      host: this.cfg.get<string>('SMTP_HOST'),
      port: Number(this.cfg.get<string>('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.cfg.get<string>('SMTP_USER'),
        pass: this.cfg.get<string>('SMTP_PASS'),
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10,
    });

    this.transporter.verify((err) => {
      if (err) this.logger.error('SMTP verify failed', err);
      else this.logger.log('SMTP server is ready');
    });
  }

  async addEmailJob(data: any, options?: JobsOptions) {
    return this.queue.add('send', data, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
      ...options,
    });
  }

  private async sendEmail(data: IEmailJobPayload) {

    if (!data.to || !data.subject) {
      throw new Error('Email must have a recipient and subject');
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.cfg.get<string>('SMTP_FROM') ?? this.cfg.get<string>('SMTP_USER'),
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
      });

      if (!info.messageId) {
        throw new Error(`Email send failed: no messageId returned for ${data.to}`);
      }

      this.logger.log(`Email sent successfully to ${data.to} messageId: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`Email failed to send to ${data.to}: ${err.message}`);
      throw err;
    }
  }

}
