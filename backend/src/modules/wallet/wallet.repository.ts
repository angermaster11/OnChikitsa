import { Types } from 'mongoose';
import { PAYMENT_STATUS, SETTLEMENT_STATUS } from '../../utils/constants';
import { Transaction } from '../payments/payment.model';

/**
 * The per-clinic settlement rollup, aggregated live from the clinic's
 * transactions. Money fields count PAID transactions only. `pending*` / `settled*`
 * split the clinic's 90% share by `settlement.status`; the fee/commission/GST sums
 * feed the admin's printable bill (platform earning = platformShare = fee +
 * commission + GST).
 */
export interface WalletRollup {
  clinicId: string;
  clinicName: string;
  transactionCount: number;
  paidCount: number;
  pendingCount: number;
  settledCount: number;
  totalCollectedPaise: number;
  clinicPayablePaise: number;
  platformSharePaise: number;
  pendingPaise: number;
  settledPaise: number;
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  gstPaise: number;
  lastTransactionAt: Date | null;
  lastSettledAt: Date | null;
}

const isPaid = { $eq: ['$status', PAYMENT_STATUS.PAID] };
const isPaidPending = {
  $and: [isPaid, { $eq: ['$settlement.status', SETTLEMENT_STATUS.PENDING] }],
};
const isPaidSettled = {
  $and: [isPaid, { $eq: ['$settlement.status', SETTLEMENT_STATUS.PAID] }],
};
const sumIf = (cond: unknown, value: unknown) => ({ $sum: { $cond: [cond, value, 0] } });

interface RawRollup {
  _id: Types.ObjectId;
  clinicName: string;
  transactionCount: number;
  paidCount: number;
  pendingCount: number;
  settledCount: number;
  totalCollectedPaise: number;
  clinicPayablePaise: number;
  platformSharePaise: number;
  pendingPaise: number;
  settledPaise: number;
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  gstPaise: number;
  lastTransactionAt: Date | null;
  lastSettledAt: Date | null;
}

function toRollup(r: RawRollup): WalletRollup {
  return {
    clinicId: String(r._id),
    clinicName: r.clinicName,
    transactionCount: r.transactionCount ?? 0,
    paidCount: r.paidCount ?? 0,
    pendingCount: r.pendingCount ?? 0,
    settledCount: r.settledCount ?? 0,
    totalCollectedPaise: r.totalCollectedPaise ?? 0,
    clinicPayablePaise: r.clinicPayablePaise ?? 0,
    platformSharePaise: r.platformSharePaise ?? 0,
    pendingPaise: r.pendingPaise ?? 0,
    settledPaise: r.settledPaise ?? 0,
    consultationFeePaise: r.consultationFeePaise ?? 0,
    platformFeePaise: r.platformFeePaise ?? 0,
    commissionPaise: r.commissionPaise ?? 0,
    gstPaise: r.gstPaise ?? 0,
    lastTransactionAt: r.lastTransactionAt ?? null,
    lastSettledAt: r.lastSettledAt ?? null,
  };
}

/** Aggregation layer for the MyWallet ledger — rolls transactions up per clinic. */
export const walletRepository = {
  async rollup(clinicId?: string): Promise<WalletRollup[]> {
    const match =
      clinicId && Types.ObjectId.isValid(clinicId)
        ? { clinicId: new Types.ObjectId(clinicId) }
        : clinicId
          ? { clinicId: new Types.ObjectId('000000000000000000000000') } // invalid id → empty
          : {};
    const rows = await Transaction.aggregate<RawRollup>([
      { $match: match },
      {
        $group: {
          _id: '$clinicId',
          clinicName: { $last: '$clinicName' },
          transactionCount: { $sum: 1 },
          paidCount: sumIf(isPaid, 1),
          pendingCount: sumIf(isPaidPending, 1),
          settledCount: sumIf(isPaidSettled, 1),
          totalCollectedPaise: sumIf(isPaid, '$breakdown.totalPaise'),
          clinicPayablePaise: sumIf(isPaid, '$breakdown.clinicAmountPaise'),
          platformSharePaise: sumIf(isPaid, '$breakdown.platformAmountPaise'),
          pendingPaise: sumIf(isPaidPending, '$breakdown.clinicAmountPaise'),
          settledPaise: sumIf(isPaidSettled, '$breakdown.clinicAmountPaise'),
          consultationFeePaise: sumIf(isPaid, '$breakdown.consultationFeePaise'),
          platformFeePaise: sumIf(isPaid, '$breakdown.platformFeePaise'),
          commissionPaise: sumIf(isPaid, '$breakdown.commissionPaise'),
          gstPaise: sumIf(isPaid, '$breakdown.gstPaise'),
          lastTransactionAt: { $max: '$createdAt' },
          lastSettledAt: { $max: '$settlement.settledAt' },
        },
      },
      { $sort: { pendingPaise: -1, clinicName: 1 } },
    ]);
    return rows.map(toRollup);
  },

  /** Single-clinic rollup, or null when the clinic has no transactions at all. */
  async rollupForClinic(clinicId: string): Promise<WalletRollup | null> {
    const [row] = await this.rollup(clinicId);
    return row ?? null;
  },
};
