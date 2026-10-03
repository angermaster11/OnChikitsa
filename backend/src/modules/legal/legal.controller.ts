import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { legalService } from './legal.service';
import type { UpdateLegalBody } from './legal.validation';

export const legalController = {
  getLegal: asyncHandler(async (_req: Request, res: Response) => {
    const legal = await legalService.getLegal();
    sendSuccess(res, legal, 'Legal documents retrieved');
  }),

  updateLegal: asyncHandler(async (req: Request, res: Response) => {
    const legal = await legalService.updateLegal(req.body as UpdateLegalBody);
    sendSuccess(res, legal, 'Legal documents updated');
  }),
};
