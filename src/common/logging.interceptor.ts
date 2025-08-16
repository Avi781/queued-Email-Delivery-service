import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;
    const start = Date.now();

    this.logger.log(`--> ${method} ${url} body=${JSON.stringify(body)}`);

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const ms = Date.now() - start;
        this.logger.log(`<-- ${method} ${url} status=${res.statusCode} ${ms}ms`);
      }),
    );
  }
}
