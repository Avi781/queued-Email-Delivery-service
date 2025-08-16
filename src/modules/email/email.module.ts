import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailQueue } from './email.queue';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailController } from './email.controller';
import { EmailLog, EmailLogSchema } from './schemas/email-log.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: EmailLog.name, schema: EmailLogSchema }])],
  providers: [EmailService, EmailQueue],
  controllers: [EmailController],
  exports: [EmailService, EmailQueue],
})
export class EmailModule {}
