import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async controller so any rejected promise is forwarded to Express'
 * error-handling middleware instead of crashing the process. Keeps controllers
 * free of repetitive try/catch.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
