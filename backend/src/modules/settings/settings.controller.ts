import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { settingsService } from './settings.service';
import type { UpdatePricingSettingsBody } from './settings.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const settingsController = {
  getPricing: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsService.getPricing();
    sendSuccess(res, settings, 'Pricing settings retrieved');
  }),

  updatePricing: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const settings = await settingsService.updatePricing(
      actor,
      req.body as UpdatePricingSettingsBody,
      ctx(req),
    );
    sendSuccess(res, settings, 'Pricing settings updated');
  }),
};
