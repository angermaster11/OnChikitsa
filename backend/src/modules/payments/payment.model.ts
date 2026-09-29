import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import {
  PAYMENT_STATUS,
  SETTLEMENT_STATUS,
  GST_BASE,
  type PaymentStatus,
  type SettlementStatus,
  type GstBase,
} from '../../utils/constants';

/**
 * A transaction for a booking, collected through Razorpay checkout (native SDK on
 * Android, checkout.js on web). The platform captures the FULL amount into its
 * single Razorpay account; there is no gateway split and no per-clinic payout. The
 * clinic's share is settled to it manually/offline by the admin, tracked on the
 * `settlement` sub-doc and rolled up per clinic in the MyWallet ledger.
 *
 * `razorpayOrderId` is the Razorpay order id (`order_…`) we create up front and
 * look the transaction up by on verify / webhook; it is unique among the documents
 * that carry it (partial unique index). The full price breakdown is SNAPSHOTTED at
 * order-creation time so later edits to clinic fees / pricing settings never rewrite
 * history, and reports read the exact amounts charged.
 *
 * Money is integer paise. `breakdown.clinicAmountPaise` is the clinic's 90% share
 * (mirrored onto `settlement.amountPaise`); `breakdown.platformAmountPaise` is
 * what the platform keeps (derived by subtraction — see pricing.ts).
 */
export interface PaymentBreakdownSnapshot {
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  commissionPercent: number;
  gstBasePaise: number;
  gstRate: number;
  gstBase: GstBase;
  gstPaise: number;
  totalPaise: number;
  clinicAmountPaise: number;
  platformAmountPaise: number;
}

/**
 * Offline settlement of the clinic's share for a PAID transaction. `amountPaise`
 * mirrors `breakdown.clinicAmountPaise` (the clinic's 90%). The admin flips
 * `status` to PAID (per-transaction, or in bulk via "settle all pending" on the
 * clinic's wallet), stamping who did it and when.
 */
export interface TransactionSettlement {
  status: SettlementStatus;
  amountPaise: number;
  settledAt?: Date | null;
  settledBy?: Types.ObjectId | null;
  note?: string | null;
}

export interface TransactionDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  clinicId: Types.ObjectId;
  /** Clinic name snapshot so admin tables need no clinic join. */
  clinicName: string;
  appointmentId?: Types.ObjectId | null;
  /** The Razorpay order id (`order_…`) we create up front; unique among rows. */
  razorpayOrderId?: string | null;
  /** Razorpay's payment id (`pay_…`), set once the checkout signature is verified. */
  razorpayPaymentId?: string | null;
  /** The checkout success signature, kept for audit once verified. */
  razorpaySignature?: string | null;
  /** Raw Razorpay payment status string (e.g. "captured", "failed"). */
  razorpayStatus?: string | null;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  breakdown: PaymentBreakdownSnapshot;
  settlement: TransactionSettlement;
  /** Snapshot of the paying user's contact for checkout prefill / receipts. */
  contact?: { name?: string; email?: string; phone?: string } | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const breakdownSchema = new Schema<PaymentBreakdownSnapshot>(
  {
    consultationFeePaise: { type: Number, required: true },
    platformFeePaise: { type: Number, required: true },
    commissionPaise: { type: Number, required: true },
    commissionPercent: { type: Number, required: true },
    gstBasePaise: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gstBase: { type: String, enum: Object.values(GST_BASE), required: true },
    gstPaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },
    clinicAmountPaise: { type: Number, required: true },
    platformAmountPaise: { type: Number, required: true },
  },
  { _id: false },
);

const settlementSchema = new Schema<TransactionSettlement>(
  {
    status: {
      type: String,
      enum: Object.values(SETTLEMENT_STATUS),
      default: SETTLEMENT_STATUS.PENDING,
      required: true,
    },
    amountPaise: { type: Number, required: true, min: 0 },
    settledAt: { type: Date, default: null },
    settledBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    note: { type: String, default: null },
  },
  { _id: false },
);

const transactionSchema = new Schema<TransactionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    clinicName: { type: String, required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
    // Uniqueness is enforced by the partial index below (a null id must not clash
    // with rows that never got an order id), so no inline `unique` here.
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    razorpayStatus: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    breakdown: { type: breakdownSchema, required: true },
    settlement: { type: settlementSchema, required: true },
    contact: {
      type: new Schema(
        { name: String, email: String, phone: String },
        { _id: false },
      ),
      default: null,
    },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  {
    collection: 'transactions',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Clinic earnings reads: transactions for a clinic, newest first.
transactionSchema.index({ clinicId: 1, status: 1, createdAt: -1 });
// User's own payment history.
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ razorpayPaymentId: 1 });
// Wallet settlement queries: a clinic's pending vs settled shares.
transactionSchema.index({ clinicId: 1, 'settlement.status': 1 });
// One order id per row — but a null id must not collide, so index only rows that
// actually carry the id (partial unique).
transactionSchema.index(
  { razorpayOrderId: 1 },
  { unique: true, partialFilterExpression: { razorpayOrderId: { $type: 'string' } } },
);

export const Transaction: Model<TransactionDoc> = model<TransactionDoc>(
  'Transaction',
  transactionSchema,
);
