import type { Request } from 'express';

/** Extract a Bearer token from the Authorization header, or null. */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** Client IP, honouring the proxy chain when `trust proxy` is enabled. */
export function getClientIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

export function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}
