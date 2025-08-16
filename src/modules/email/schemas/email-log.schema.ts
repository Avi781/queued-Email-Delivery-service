import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EmailStatusEnum } from '../model/email.status.enum';
import { Document } from 'mongoose';

export type EmailLogDocument = EmailLog & Document;

@Schema({ timestamps: true })
export class EmailLog {
  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  subject: string;

  @Prop()
  text?: string;

  @Prop()
  html?: string;

  @Prop({
    type: String,
    enum: [EmailStatusEnum.queued, EmailStatusEnum.failed, EmailStatusEnum.sent],
    default: EmailStatusEnum.queued,
  })
  status: EmailStatusEnum;

  @Prop()
  jobId?: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  error?: string;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
