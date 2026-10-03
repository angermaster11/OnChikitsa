import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { deviceTokenRepository } from './deviceToken.repository';
import type { RegisterDeviceBody, UnregisterDeviceBody } from './notification.validation';

function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const deviceController = {
  /** POST /user/devices — register (upsert) the caller's FCM token. */
  register: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const body = req.body as RegisterDeviceBody;
    await deviceTokenRepository.upsert(actor.role === 'CLINIC' ? 'CLINIC' : 'USER', actor.id, body.token, body.platform ?? 'android');
    sendSuccess(res, { registered: true }, 'Device registered');
  }),

  /** POST /user/devices/remove — drop a token (logout / opt-out). */
  unregister: asyncHandler(async (req: Request, res: Response) => {
    requireActor(req);
    const body = req.body as UnregisterDeviceBody;
    await deviceTokenRepository.remove(body.token);
    sendSuccess(res, { unregistered: true }, 'Device unregistered');
  }),
};
