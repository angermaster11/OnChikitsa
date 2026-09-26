import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { AuditLog, type AuditLogDoc } from './auditLog.model';
import type { AuditLogFilters, RecordAuditInput } from './audit.types';

/**
 * Data-access layer for audit logs. Deliberately exposes NO update or delete
 * methods — audit logs are append-only.
 */
export const auditRepository = {
  async create(input: RecordAuditInput): Promise<AuditLogDoc> {
    const docs = await AuditLog.create(
      [
        {
          actorId: input.actorId ? new Types.ObjectId(String(input.actorId)) : null,
          actorRole: input.actorRole,
          actorName: input.actorName,
          actorEmail: input.actorEmail,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ? new Types.ObjectId(String(input.targetId)) : null,
          targetName: input.targetName,
          description: input.description,
          metadata: input.metadata,
          ipAddress: input.ip,
          userAgent: input.userAgent,
        },
      ],
      input.session ? { session: input.session } : {},
    );
    return docs[0]!;
  },

  buildFilter(filters: AuditLogFilters): FilterQuery<AuditLogDoc> {
    const query: FilterQuery<AuditLogDoc> = {};
    if (filters.actorId && Types.ObjectId.isValid(filters.actorId)) {
      query.actorId = new Types.ObjectId(filters.actorId);
    }
    if (filters.actorRole) query.actorRole = filters.actorRole;
    if (filters.action) query.action = filters.action;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.targetId && Types.ObjectId.isValid(filters.targetId)) {
      query.targetId = new Types.ObjectId(filters.targetId);
    }
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = filters.from;
      if (filters.to) query.createdAt.$lte = filters.to;
    }
    return query;
  },

  async list(
    filter: FilterQuery<AuditLogDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: AuditLogDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<AuditLogDoc[]>(),
      AuditLog.countDocuments(filter),
    ]);
    return { items, total };
  },

  async findById(id: string): Promise<AuditLogDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return AuditLog.findById(id).lean<AuditLogDoc>();
  },

  async countByActions(session?: ClientSession | null): Promise<number> {
    return AuditLog.countDocuments().session(session ?? null);
  },
};
