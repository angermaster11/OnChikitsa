import { Types } from 'mongoose';
import { computeBreakdown, rupeesToPaise } from '../../src/modules/payments/pricing';
import { Transaction } from '../../src/modules/payments/payment.model';
import { Wallet } from '../../src/modules/wallet/wallet.model';
import { walletService } from '../../src/modules/wallet/wallet.service';
import { GST_BASE, PAYMENT_STATUS, SETTLEMENT_STATUS, ROLES } from '../../src/utils/constants';
import type { AuthActor } from '../../src/types/auth';
// getClinicWallet populates a transaction's appointmentId — register the model.
import '../../src/modules/appointments/appointment.model';

/**
 * MyWallet is a materialised cache whose source of truth is each Transaction's
 * status + settlement.status. These tests drive the real pricing engine into
 * Transactions and assert the rollup math + settlement transitions hold, and that
 * the ledger never leaks a paisa (clinic 90% + platform share == total collected).
 */
const PRICING = {
  platformFeePaise: rupeesToPaise(25),
  commissionPercent: 10,
  gstRate: 18,
  gstBase: GST_BASE.PLATFORM_REVENUE,
  currency: 'INR',
};

/** A price breakdown for a rupee consultation fee, via the real pricing engine. */
function breakdownFor(feeRupees: number) {
  return computeBreakdown({ ...PRICING, consultationFeePaise: rupeesToPaise(feeRupees) });
}

let txnSeq = 0;
async function makeTx(
  clinicId: Types.ObjectId,
  opts: { feeRupees?: number; status?: string; settlement?: string; clinicName?: string } = {},
) {
  const b = breakdownFor(opts.feeRupees ?? 500);
  txnSeq += 1;
  return Transaction.create({
    userId: new Types.ObjectId(),
    clinicId,
    clinicName: opts.clinicName ?? 'Test Clinic',
    razorpayOrderId: `order_test${String(txnSeq).padStart(14, '0')}`,
    status: opts.status ?? PAYMENT_STATUS.PAID,
    amountPaise: b.totalPaise,
    currency: 'INR',
    breakdown: b,
    settlement: { status: opts.settlement ?? SETTLEMENT_STATUS.PENDING, amountPaise: b.clinicAmountPaise },
  });
}

const admin: AuthActor = {
  kind: 'STAFF',
  id: new Types.ObjectId().toHexString(),
  role: ROLES.ADMIN,
  name: 'Test Admin',
  email: 'admin@test.dev',
  permissions: [],
};

describe('walletService.recomputeWallet', () => {
  it('rolls PAID transactions up per clinic and ignores CREATED/REFUNDED', async () => {
    const clinicId = new Types.ObjectId();
    await makeTx(clinicId, { feeRupees: 500, settlement: SETTLEMENT_STATUS.PENDING });
    await makeTx(clinicId, { feeRupees: 1000, settlement: SETTLEMENT_STATUS.PENDING });
    await makeTx(clinicId, { feeRupees: 500, settlement: SETTLEMENT_STATUS.PAID });
    await makeTx(clinicId, { feeRupees: 500, status: PAYMENT_STATUS.CREATED });
    await makeTx(clinicId, { feeRupees: 500, status: PAYMENT_STATUS.REFUNDED });

    const w = await walletService.recomputeWallet(String(clinicId));

    const b500 = breakdownFor(500);
    const b1000 = breakdownFor(1000);
    expect(w.transactionCount).toBe(5);
    expect(w.paidCount).toBe(3);
    expect(w.pendingCount).toBe(2);
    expect(w.settledCount).toBe(1);
    expect(w.totalCollectedPaise).toBe(b500.totalPaise * 2 + b1000.totalPaise);
    expect(w.clinicPayablePaise).toBe(b500.clinicAmountPaise * 2 + b1000.clinicAmountPaise);
    expect(w.platformSharePaise).toBe(b500.platformAmountPaise * 2 + b1000.platformAmountPaise);
    expect(w.pendingPaise).toBe(b500.clinicAmountPaise + b1000.clinicAmountPaise);
    expect(w.settledPaise).toBe(b500.clinicAmountPaise);
    // Never leaks a paisa across the whole clinic ledger.
    expect(w.clinicPayablePaise + w.platformSharePaise).toBe(w.totalCollectedPaise);
  });

  it('persists the summary into the Wallet collection (materialised cache)', async () => {
    const clinicId = new Types.ObjectId();
    await makeTx(clinicId, { feeRupees: 500 });
    await walletService.recomputeWallet(String(clinicId));

    const doc = await Wallet.findOne({ clinicId }).lean();
    expect(doc).not.toBeNull();
    expect(doc!.pendingPaise).toBe(breakdownFor(500).clinicAmountPaise);
    expect(doc!.paidCount).toBe(1);
  });

  it('returns a zeroed summary for a clinic with no transactions', async () => {
    const w = await walletService.recomputeWallet(new Types.ObjectId().toHexString());
    expect(w.transactionCount).toBe(0);
    expect(w.pendingPaise).toBe(0);
    expect(w.totalCollectedPaise).toBe(0);
  });
});

describe('walletService bill + settlement', () => {
  it('bill platform earning == platform fee + commission + GST, and clinic + platform == total', async () => {
    const clinicId = new Types.ObjectId();
    await makeTx(clinicId, { feeRupees: 500 });
    await makeTx(clinicId, { feeRupees: 1000 });

    const { bill, transactions } = await walletService.getClinicWallet(String(clinicId));
    expect(transactions).toHaveLength(2);
    expect(bill.platformEarningPaise).toBe(bill.platformFeePaise + bill.commissionPaise + bill.gstPaise);
    expect(bill.clinicPayablePaise + bill.platformEarningPaise).toBe(bill.totalCollectedPaise);
  });

  it('settleClinic clears the whole pending payable at once', async () => {
    const clinicId = new Types.ObjectId();
    await makeTx(clinicId, { feeRupees: 500 });
    await makeTx(clinicId, { feeRupees: 1000 });
    await makeTx(clinicId, { feeRupees: 500, settlement: SETTLEMENT_STATUS.PAID });

    const b500 = breakdownFor(500);
    const b1000 = breakdownFor(1000);
    const res = await walletService.settleClinic(admin, String(clinicId), {});
    expect(res.settledCount).toBe(2);
    expect(res.settledPaise).toBe(b500.clinicAmountPaise + b1000.clinicAmountPaise);
    expect(res.wallet.pendingPaise).toBe(0);
    expect(res.wallet.pendingCount).toBe(0);
    expect(res.wallet.settledCount).toBe(3);
    expect(res.wallet.settledPaise).toBe(b500.clinicAmountPaise * 2 + b1000.clinicAmountPaise);
  });

  it('settleTransaction flips one PAID+PENDING transaction to settled', async () => {
    const clinicId = new Types.ObjectId();
    const tx = await makeTx(clinicId, { feeRupees: 500 });

    const { transaction, wallet } = await walletService.settleTransaction(admin, String(tx._id), {});
    expect(transaction.settlement.status).toBe(SETTLEMENT_STATUS.PAID);
    expect(transaction.settlement.settledAt).toBeTruthy();
    expect(wallet.pendingPaise).toBe(0);
    expect(wallet.settledPaise).toBe(breakdownFor(500).clinicAmountPaise);
  });

  it('refuses to settle a transaction that is not PAID', async () => {
    const clinicId = new Types.ObjectId();
    const tx = await makeTx(clinicId, { status: PAYMENT_STATUS.CREATED });
    await expect(walletService.settleTransaction(admin, String(tx._id), {})).rejects.toThrow();
  });
});
