import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { AppError, UnauthorizedError, ERROR_CODES } from '../../utils/errors';
import { isCloudinaryConfigured, signUpload } from '../../config/cloudinary';
import type { UploadSignatureBody } from './upload.validation';

function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const uploadController = {
  /**
   * Hand the authenticated clinic a signed set of Cloudinary upload params. The
   * folder is derived server-side from the clinic id + asset kind so a client
   * can never write into another clinic's folder. The client uploads the file
   * itself (with progress) using these params; the secret stays here.
   */
  signature: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    if (!isCloudinaryConfigured()) {
      throw new AppError(
        503,
        ERROR_CODES.UPLOAD_NOT_CONFIGURED,
        'Image uploads are not configured on the server',
      );
    }
    const { kind } = req.body as UploadSignatureBody;
    const folder = `onchikitsa/clinics/${actor.id}/${kind}`;
    const sig = signUpload({ folder });
    sendSuccess(res, sig, 'Upload signature created');
  }),
};
