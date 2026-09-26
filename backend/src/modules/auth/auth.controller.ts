import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { authService } from './auth.service';
import type { LoginBody, RefreshBody, LogoutBody } from './auth.validation';

/** Thin controllers: parse request context, delegate to the service, format. */
export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginBody;
    const result = await authService.login({
      email,
      password,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    sendSuccess(res, result, 'Login successful');
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshBody;
    const tokens = await authService.refresh(refreshToken, {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    sendSuccess(res, tokens, 'Token refreshed');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) throw new UnauthorizedError();
    const { refreshToken } = req.body as LogoutBody;
    await authService.logout(
      refreshToken,
      { id: actor.id, role: actor.role, name: actor.name, email: actor.email },
      { ip: getClientIp(req), userAgent: getUserAgent(req) },
    );
    sendSuccess(res, null, 'Logged out');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) throw new UnauthorizedError();
    sendSuccess(
      res,
      {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        permissions: actor.permissions,
      },
      'Current admin',
    );
  }),
};
