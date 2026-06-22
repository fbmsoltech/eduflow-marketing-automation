import { Global, Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';

const CORRELATION_ID_HEADER = 'x-correlation-id';

interface SerializedRequest {
  id?: string;
  method?: string;
  url?: string;
}

interface SerializedResponse {
  statusCode?: number;
}

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL']?.trim() || 'info',
        autoLogging: process.env['NODE_ENV'] !== 'test',
        genReqId: (request: IncomingMessage, response: ServerResponse): string => {
          const header = request.headers[CORRELATION_ID_HEADER];
          const correlationId =
            (Array.isArray(header) ? header[0] : header)?.trim() || randomUUID();

          response.setHeader(CORRELATION_ID_HEADER, correlationId);
          return correlationId;
        },
        customProps: (request) => ({
          correlationId: request.id,
        }),
        serializers: {
          req: (request: SerializedRequest) => ({
            id: request.id,
            method: request.method,
            url: request.url,
          }),
          res: (response: SerializedResponse) => ({
            statusCode: response.statusCode,
          }),
        },
      },
    }),
  ],
  exports: [LoggerModule],
})
export class ObservabilityModule {}
