import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { dashboardService } from './dashboard.service';

/** Read-only dashboard endpoint. Aggregation logic lives in the service. */
export const dashboardController = {
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await dashboardService.getStats(), 'Dashboard stats');
  }),
};
