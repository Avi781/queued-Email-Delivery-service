import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class EmailController {
  constructor(private readonly service: EmailService) {}

  @Post('send')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) 
  send(@Body() dto: SendEmailDto) {
    return this.service.enqueueEmail(dto);
  }

  @Get('logs/email')
  logs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.service.getLogs(Number(page), Number(limit));
  }
}
