import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { type Role, type TargetType } from '../../utils/constants';
import type { AuditAction } from '../../utils/auditActions';

/**
 * Immutable audit record. Every security/business-sensitive admin action writes
 * one of these. Immutability is enforced two ways: (1) no update/delete API is
 * ever exposed, and (2) model-level hooks below reject any update/delete attempt
 * as defence-in-depth. The actor is ALWAYS captured (id, role, name, email) so
 * the UI can say exactly who did what.
 */
export interface AuditLogDoc extends Document<Types.ObjectId> {
  actorId: Types.ObjectId | null;
  actorRole: Role;
  actorName: string;
  actorEmail?: string;
  action: AuditAction;
  targetType: TargetType;
  targetId?: Types.ObjectId | null;
  targetName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, default: null },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetName: { type: String },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    // Audit logs are append-only: creation time only, never updated.
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Immutability guard: block any attempt to mutate or delete existing logs.
const blockMutation = function (this: unknown, next: (err?: Error) => void) {
  next(new Error('Audit logs are immutable and cannot be modified or deleted'));
};
auditLogSchema.pre('updateOne', blockMutation);
auditLogSchema.pre('updateMany', blockMutation);
auditLogSchema.pre('findOneAndUpdate', blockMutation);
auditLogSchema.pre('deleteOne', blockMutation);
auditLogSchema.pre('deleteMany', blockMutation);
auditLogSchema.pre('findOneAndDelete', blockMutation);

// Indexes backing the audit-log filters (actor / role / action / target / date).
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ actorRole: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const AuditLog: Model<AuditLogDoc> = model<AuditLogDoc>('AuditLog', auditLogSchema);
