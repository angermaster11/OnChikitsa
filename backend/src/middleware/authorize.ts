import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import type { Permission } from '../rbac/permissions';

/**
 * Permission-based authorization guard. Must run AFTER an auth middleware has
 * populated `req.actor`. Rejects with 403 unless the actor holds ALL required
 * permissions. This is the security boundary — the frontend hiding a button is
 * only UX; this is what actually stops an unauthorized request.
 */
export function authorize(...required: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      next(new UnauthorizedError());
      return;
    }
    const granted = new Set(actor.permissions);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
