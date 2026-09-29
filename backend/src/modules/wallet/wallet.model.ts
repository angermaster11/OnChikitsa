import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * MyWallet — a per-clinic settlement ledger. One document per clinic (unique
 * `clinicId`), materialised from that clinic's transactions. It is a CACHE: the
 * source of truth is each Transaction's `status` + `settlement.status`, and the
 * doc is rebuilt in full by `walletService.recomputeWallet(clinicId)` after every
 * change (booking paid, cancellation, settlement) rather than by fragile
 * incremental deltas.
 *
 * All amounts are integer paise and count PAID transactions only (FAILED /
 * CREATED / REFUNDED are excluded from the money totals):
 *  - totalCollectedPaise — Σ breakdown.totalPaise (full amount the platform took)
 *  - clinicPayablePaise  — Σ breakdown.clinicAmountPaise (the clinic's 90%)
 *  - platformSharePaise  — Σ breakdown.platformAmountPaise (fee + commission + GST)
 *  - pendingPaise        — Σ clinicAmountPaise where settlement is PENDING (owed)
 *  - settledPaise        — Σ clinicAmountPaise where settlement is PAID
 */
export interface WalletDoc extends Document<Types.ObjectId> {
  clinicId: Types.ObjectId;
  clinicName: string;
  totalCollectedPaise: number;
  clinicPayablePaise: number;
  platformSharePaise: number;
  pendingPaise: number;
  settledPaise: number;
  paidCount: number;
  pendingCount: number;
  settledCount: number;
  transactionCount: number;
  lastTransactionAt?: Date | null;
  lastSettledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<WalletDoc>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, unique: true },
    clinicName: { type: String, required: true },
    totalCollectedPaise: { type: Number, required: true, default: 0, min: 0 },
    clinicPayablePaise: { type: Number, required: true, default: 0, min: 0 },
    platformSharePaise: { type: Number, required: true, default: 0, min: 0 },
    pendingPaise: { type: Number, required: true, default: 0, min: 0 },
    settledPaise: { type: Number, required: true, default: 0, min: 0 },
    // Count of PAID transactions (participating in settlement).
    paidCount: { type: Number, required: true, default: 0, min: 0 },
    // PAID transactions still owed (settlement PENDING).
    pendingCount: { type: Number, required: true, default: 0, min: 0 },
    // PAID transactions already settled (settlement PAID).
    settledCount: { type: Number, required: true, default: 0, min: 0 },
    // All transactions for the clinic regardless of status (paid or not).
    transactionCount: { type: Number, required: true, default: 0, min: 0 },
    lastTransactionAt: { type: Date, default: null },
    lastSettledAt: { type: Date, default: null },
  },
  {
    collection: 'wallets',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const Wallet: Model<WalletDoc> = model<WalletDoc>('Wallet', walletSchema);
