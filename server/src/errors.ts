import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ error: { message: 'The submitted request is too large.' } });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Please check the submitted fields.', fields: err.flatten().fieldErrors },
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be 5 MB or smaller.'
            : 'Invalid image upload.',
      },
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          message: 'This record already exists, or an ownership claim has already been approved.',
        },
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        error: { message: 'This record is linked to other records and cannot be removed.' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Record not found.' } });
      return;
    }
    if (err.code === 'P2034') {
      res
        .status(409)
        .json({ error: { message: 'Another update occurred. Refresh and try again.' } });
      return;
    }
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: { message: 'Invalid JSON body.' } });
    return;
  }
  console.error('Request failed:', err instanceof Error ? err.name : 'UnknownError');
  res
    .status(503)
    .json({ error: { message: 'The service is temporarily unavailable. Please try again.' } });
};
