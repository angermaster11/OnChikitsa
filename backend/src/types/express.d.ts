import type { AuthActor } from './auth';

// Augment Express' Request with the authenticated actor and a request id so
// controllers/services can read identity without re-parsing tokens.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: AuthActor;
      id?: string;
    }
  }
}

export {};
