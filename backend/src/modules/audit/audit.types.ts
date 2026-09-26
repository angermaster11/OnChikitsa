import type { ClientSession, Types } from 'mongoose';
import type { Role, TargetType } from '../../utils/constants';
import type { AuditAction } from '../../utils/auditActions';
import type { AuthActor } from '../../types/auth';

/** Everything needed to write one immutable audit record. */
export interface RecordAuditInput {
  actorId?: string | Types.ObjectId | null;
  actorRole: Role;
  actorName: string;
  actorEmail?: string;
  action: AuditAction;
  targetType: TargetType;
  targetId?: string | Types.ObjectId | null;
  targetName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  session?: ClientSession | null;
}

/** Convenience shape when the actor is an authenticated principal. */
export interface RecordForActorInput
  extends Omit<RecordAuditInput, 'actorId' | 'actorRole' | 'actorName' | 'actorEmail'> {
  actor: AuthActor;
}

export interface AuditLogFilters {
  actorId?: string;
  actorRole?: Role;
  action?: AuditAction;
  targetType?: TargetType;
  targetId?: string;
  from?: Date;
  to?: Date;
}
