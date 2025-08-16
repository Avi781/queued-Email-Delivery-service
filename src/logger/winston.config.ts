import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { format, transports } from 'winston';

export const winstonConfig = {
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike('API', { prettyPrint: true })
      ),
    }),
  ],
};
