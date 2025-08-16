import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailLog, EmailLogDocument } from './schemas/email-log.schema';
import { SendEmailDto } from './dto/send-email.dto';
import { ConfigService } from '@nestjs/config';
import { EmailQueue } from './email.queue';
import { EmailStatusEnum } from './model/email.status.enum';

@Injectable()
export class EmailService {
  constructor(
    @InjectModel(EmailLog.name) private readonly emailModel: Model<EmailLogDocument>,
    private readonly cfg: ConfigService,
    @Inject(forwardRef(() => EmailQueue)) private readonly emailQueue: EmailQueue,
  ) { }


  async enqueueEmail(dto: SendEmailDto) {
    const from = this.cfg.get<string>('SMTP_FROM');

    const log = await this.emailModel.create({
      to: dto.to,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      status: 'queued',
    });

    // Use the log ID as the job ID to ensure idempotency
    const logId = (log._id as Types.ObjectId).toString();

    await this.emailQueue.bullQueue.add(
      'send',
      { ...dto, from },
      { jobId: logId, attempts: 3, backoff: { type: 'fixed', delay: 5000 } },
    );

    await this.emailModel.updateOne({ _id: log._id }, { jobId: logId });
    return { id: logId, status: 'queued' as const };
  }

  async updateLogStatus(id: string, status: EmailStatusEnum, errorMsg?: string) {
    const update: Partial<EmailLog> = { status };

    if (status === EmailStatusEnum.sent) {
      update.sentAt = new Date();
    } else if (status === EmailStatusEnum.failed) {
      update.failedAt = new Date();
      if (errorMsg) update.error = errorMsg;
    }

    await this.emailModel.updateOne({ _id: new Types.ObjectId(id) }, update);
  }

  async getLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.emailModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.emailModel.countDocuments(),
    ]);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [sentToday, failedToday] = await Promise.all([
      this.emailModel.countDocuments({ status: 'sent', sentAt: { $gte: start, $lte: end } }),
      this.emailModel.countDocuments({ status: 'failed', failedAt: { $gte: start, $lte: end } }),
    ]);

    const totalToday = sentToday + failedToday;

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { totalToday, sentToday, failedToday },
    };
  }
}
