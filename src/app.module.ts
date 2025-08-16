import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const uri = cfg.get<string>('MONGO_URI');
        // console.log('Loaded MONGO_URI:', uri); // Debug
        if (!uri) throw new Error('MONGO_URI environment variable is not set');
        return { uri };
      }

    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ([
        {
          ttl: Number(cfg.get<string>('RATE_TTL') ?? 60000),
          limit: Number(cfg.get<string>('RATE_LIMIT') ?? 10),
        },
      ]),
    }),

    EmailModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
