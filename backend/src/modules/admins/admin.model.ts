import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { ADMIN_STATUS, ROLES, type AdminStatus, type Role } from '../../utils/constants';
import type { Permission } from '../../rbac/permissions';

/**
 * `Admin` is the record for every STAFF account: SUPER_ADMIN, ADMIN and SUPPORT.
 * (SUPPORT is a staff role, not a separate collection.) Passwords are stored as
 * an argon2id hash in `passwordHash`, which is `select:false` so it never leaves
 * the DB layer unless explicitly requested.
 */
export interface AdminDoc extends Document<Types.ObjectId> {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  /** Explicit permission overrides; empty ⇒ use role defaults. */
  permissions: Permission[];
  status: AdminStatus;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT],
      required: true,
    },
    permissions: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(ADMIN_STATUS),
      default: ADMIN_STATUS.ACTIVE,
      required: true,
    },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Secondary indexes (email uniqueness is declared field-level above — not repeated
// here, to avoid duplicate-index warnings).
adminSchema.index({ role: 1, status: 1 });

export const Admin: Model<AdminDoc> = model<AdminDoc>('Admin', adminSchema);
