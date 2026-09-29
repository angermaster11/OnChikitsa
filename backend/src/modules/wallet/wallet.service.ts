import { NotFoundError, ConflictError, ERROR_CODES } from '../../utils/errors';
import { logger } from '../../config/logger';
import {
  PAYMENT_STATUS,
  SETTLEMENT_STATUS,
  TARGET_TYPE,
  type SettlementStatus,
} from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { Types } from 'mongoose';
import type { AuthActor } from '../../types/auth';
import { auditService } from '../audit/audit.service';
import { Clinic } from '../clinics/clinic.model';
import { Transaction, type TransactionDoc } from '../payments/payment.model';
import { paymentRepository } from '../payments/payment.repository';
import { Wallet, type WalletDoc } from './wallet.model';
import { walletRepository, type WalletRollup } from './wallet.repository';

/** The materialised per-clinic wallet, as returned to admin/clinic clients. */
export interface WalletSummary {
  clinicId: string;
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
  lastTransactionAt: Date | null;
  lastSettledAt: Date | null;
}

/** The aggregated bill for a clinic — platform earning vs the clinic's payable share. */
export interface WalletBill {
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  gstPaise: number;
  totalCollectedPaise: number;
  /** Platform's cut = platform fee + commission + GST. */
  platformEarningPaise: number;
  /** Clinic's 90% share of the consultation fee. */
  clinicPayablePaise: number;
  pendingPaise: number;
  settledPaise: number;
  paidCount: number;
  pendingCount: number;
  settledCount: number;
}

function summaryFromRollup(r: WalletRollup): WalletSummary {
  return {
    clinicId: r.clinicId,
    clinicName: r.clinicName,
    totalCollectedPaise: r.totalCollectedPaise,
    clinicPayablePaise: r.clinicPayablePaise,
    platformSharePaise: r.platformSharePaise,
    pendingPaise: r.pendingPaise,
    settledPaise: r.settledPaise,
    paidCount: r.paidCount,
    pendingCount: r.pendingCount,
    settledCount: r.settledCount,
    transactionCount: r.transactionCount,
    lastTransactionAt: r.lastTransactionAt,
    lastSettledAt: r.lastSettledAt,
  };
}

function zeroSummary(clinicId: string, clinicName: string): WalletSummary {
  return {
    clinicId,
    clinicName,
    totalCollectedPaise: 0,
    clinicPayablePaise: 0,
    platformSharePaise: 0,
    pendingPaise: 0,
    settledPaise: 0,
    paidCount: 0,
    pendingCount: 0,
    settledCount: 0,
    transactionCount: 0,
    lastTransactionAt: null,
    lastSettledAt: null,
  };
}

function billFromRollup(r: WalletRollup | null): WalletBill {
  return {
    consultationFeePaise: r?.consultationFeePaise ?? 0,
    platformFeePaise: r?.platformFeePaise ?? 0,
    commissionPaise: r?.commissionPaise ?? 0,
    gstPaise: r?.gstPaise ?? 0,
    totalCollectedPaise: r?.totalCollectedPaise ?? 0,
    platformEarningPaise: r?.platformSharePaise ?? 0,
    clinicPayablePaise: r?.clinicPayablePaise ?? 0,
    pendingPaise: r?.pendingPaise ?? 0,
    settledPaise: r?.settledPaise ?? 0,
    paidCount: r?.paidCount ?? 0,
    pendingCount: r?.pendingCount ?? 0,
    settledCount: r?.settledCount ?? 0,
  };
}

/** Upsert the materialised Wallet doc so the collection mirrors the latest rollup. */
async function persist(summary: WalletSummary): Promise<void> {
  if (!Types.ObjectId.isValid(summary.clinicId)) return;
  try {
    await Wallet.findOneAndUpdate(
      { clinicId: new Types.ObjectId(summary.clinicId) },
      {
        $set: {
          clinicName: summary.clinicName,
          totalCollectedPaise: summary.totalCollectedPaise,
          clinicPayablePaise: summary.clinicPayablePaise,
          platformSharePaise: summary.platformSharePaise,
          pendingPaise: summary.pendingPaise,
          settledPaise: summary.settledPaise,
          paidCount: summary.paidCount,
          pendingCount: summary.pendingCount,
          settledCount: summary.settledCount,
          transactionCount: summary.transactionCount,
          lastTransactionAt: summary.lastTransactionAt,
          lastSettledAt: summary.lastSettledAt,
        },
      },
      { upsert: true, new: true },
    );
  } catch (err) {
    logger.error({ err, clinicId: summary.clinicId }, 'Wallet persist failed');
  }
}

export const walletService = {
  /**
   * Rebuild one clinic's wallet from its transactions (source of truth = each
   * Transaction's status + settlement.status) and mirror it into the Wallet
   * collection. Returns the fresh summary. Called after every money-affecting
   * change and on each earnings read, so the cache can never drift.
   */
  async recomputeWallet(clinicId: string): Promise<WalletSummary> {
    const rollup = await walletRepository.rollupForClinic(clinicId);
    let summary: WalletSummary;
    if (rollup) {
      summary = summaryFromRollup(rollup);
    } else {
      const clinic = Types.ObjectId.isValid(clinicId)
        ? await Clinic.findById(clinicId).select('name').lean<{ name?: string }>()
        : null;
      summary = zeroSummary(clinicId, clinic?.name ?? 'Clinic');
    }
    await persist(summary);
    return summary;
  },

  /** Admin: every clinic that has at least one transaction, most-owed first. */
  async listWallets(): Promise<WalletSummary[]> {
    const rollups = await walletRepository.rollup();
    const summaries = rollups.map(summaryFromRollup);
    await Promise.all(summaries.map((s) => persist(s)));
    return summaries;
  },

  /**
   * Admin drill-in: one clinic's wallet summary, its aggregated bill, and its
   * transactions (appointment slot populated).
   */
  async getClinicWallet(clinicId: string): Promise<{
    wallet: WalletSummary;
    bill: WalletBill;
    transactions: TransactionDoc[];
  }> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const [rollup, clinic] = await Promise.all([
      walletRepository.rollupForClinic(clinicId),
      Clinic.findById(clinicId).select('name').lean<{ name?: string }>(),
    ]);
    if (!rollup && !clinic) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const clinicName = rollup?.clinicName ?? clinic?.name ?? 'Clinic';
    const summary = rollup ? summaryFromRollup(rollup) : zeroSummary(clinicId, clinicName);
    await persist(summary);
    const { items } = await paymentRepository.list(
      paymentRepository.buildFilter({ clinicId }),
      0,
      200,
    );
    return { wallet: summary, bill: billFromRollup(rollup), transactions: items };
  },

  /** Admin: settle a single PAID transaction's clinic share (audited). */
  async settleTransaction(
    actor: AuthActor,
    txId: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ transaction: TransactionDoc; wallet: WalletSummary }> {
    if (!Types.ObjectId.isValid(txId)) {
      throw new NotFoundError(ERROR_CODES.PAYMENT_NOT_FOUND, 'Transaction not found');
    }
    const tx = await Transaction.findById(txId);
    if (!tx) throw new NotFoundError(ERROR_CODES.PAYMENT_NOT_FOUND, 'Transaction not found');
    if (tx.status !== PAYMENT_STATUS.PAID) {
      throw new ConflictError(ERROR_CODES.CONFLICT, 'Only a paid transaction can be settled');
    }
    if (tx.settlement.status === SETTLEMENT_STATUS.PAID) {
      throw new ConflictError(ERROR_CODES.CONFLICT, 'This transaction is already settled');
    }
    tx.settlement.status = SETTLEMENT_STATUS.PAID;
    tx.settlement.settledAt = new Date();
    tx.settlement.settledBy = new Types.ObjectId(actor.id);
    await tx.save();

    const wallet = await this.recomputeWallet(String(tx.clinicId));
    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.TRANSACTION_SETTLED,
      targetType: TARGET_TYPE.PAYMENT,
      targetId: tx._id,
      targetName: tx.razorpayOrderId ?? undefined,
      description: 'Settled a clinic transaction',
      metadata: {
        clinicId: String(tx.clinicId),
        clinicName: tx.clinicName,
        amountPaise: tx.settlement.amountPaise,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { transaction: tx, wallet };
  },

  /**
   * Admin: clear a clinic's entire pending payable at once — flip every PAID +
   * PENDING-settlement transaction to settled (audited).
   */
  async settleClinic(
    actor: AuthActor,
    clinicId: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ wallet: WalletSummary; settledCount: number; settledPaise: number }> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const before = await walletRepository.rollupForClinic(clinicId);
    const pendingPaise = before?.pendingPaise ?? 0;
    const now = new Date();
    const res = await Transaction.updateMany(
      {
        clinicId: new Types.ObjectId(clinicId),
        status: PAYMENT_STATUS.PAID,
        'settlement.status': SETTLEMENT_STATUS.PENDING,
      },
      {
        $set: {
          'settlement.status': SETTLEMENT_STATUS.PAID as SettlementStatus,
          'settlement.settledAt': now,
          'settlement.settledBy': new Types.ObjectId(actor.id),
        },
      },
    );
    const settledCount = res.modifiedCount ?? 0;

    const wallet = await this.recomputeWallet(clinicId);
    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.CLINIC_SETTLED,
      targetType: TARGET_TYPE.CLINIC,
      targetId: clinicId,
      targetName: wallet.clinicName,
      description: 'Settled all pending transactions for a clinic',
      metadata: { settledCount, amountPaise: pendingPaise },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { wallet, settledCount, settledPaise: pendingPaise };
  },
};

export type { WalletDoc };
