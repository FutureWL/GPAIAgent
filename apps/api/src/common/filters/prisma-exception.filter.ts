import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    // Prisma 特定错误映射
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const message = this.mapPrismaError(exception);
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
      });
      return;
    }

    // NestJS 内置异常直接返回 JSON 响应
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string' ? body : (body as any).message ?? body;
      res.status(status).json({
        statusCode: status,
        message: Array.isArray(message) ? message[0] : message,
        error: HttpStatus[status] ?? 'Error',
      });
      return;
    }

    // 未知错误：记录日志但不泄露内部信息
    this.logger.error(`Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): string {
    switch (exception.code) {
      case 'P2002':
        return '唯一约束冲突，该记录已存在';
      case 'P2025':
        return '记录不存在';
      default:
        return `数据库错误: ${exception.code}`;
    }
  }
}
