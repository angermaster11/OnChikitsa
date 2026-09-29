import { computeBreakdown, rupeesToPaise } from '../../src/modules/payments/pricing';
import { GST_BASE } from '../../src/utils/constants';

/**
 * The pricing engine is the single source of truth for how a booking total is
 * built and split, so it gets pinned down here in isolation. The canonical
 * example from the spec: ₹500 fee + ₹25 platform fee, 10% commission, 18% GST.
 */
describe('computeBreakdown', () => {
  const base = {
    consultationFeePaise: rupeesToPaise(500), // 50000
    platformFeePaise: rupeesToPaise(25), // 2500
    commissionPercent: 10,
    gstRate: 18,
    gstBase: GST_BASE.PLATFORM_REVENUE,
    currency: 'INR',
  };

  it('matches the canonical ₹500 / ₹25 / 10% / 18% breakdown', () => {
    const b = computeBreakdown(base);
    expect(b.consultationFeePaise).toBe(50000);
    expect(b.platformFeePaise).toBe(2500);
    expect(b.commissionPaise).toBe(5000); // 10% of 50000
    expect(b.gstBasePaise).toBe(7500); // platform fee + commission
    expect(b.gstPaise).toBe(1350); // 18% of 7500
    expect(b.totalPaise).toBe(53850); // fee + platform fee + gst
    expect(b.clinicAmountPaise).toBe(45000); // fee − commission ("90% of fee")
    expect(b.platformAmountPaise).toBe(8850); // total − clinic
  });

  it('never leaks a paisa: clinic + platform always equals total', () => {
    for (const fee of [49999, 50000, 33333, 12345, 99991]) {
      for (const pct of [0, 7.5, 10, 12.5, 33.33]) {
        const b = computeBreakdown({ ...base, consultationFeePaise: fee, commissionPercent: pct });
        expect(b.clinicAmountPaise + b.platformAmountPaise).toBe(b.totalPaise);
      }
    }
  });

  it('levies GST on the platform fee alone when gstBase is PLATFORM_FEE', () => {
    const b = computeBreakdown({ ...base, gstBase: GST_BASE.PLATFORM_FEE });
    expect(b.gstBasePaise).toBe(2500); // platform fee only, commission excluded
    expect(b.gstPaise).toBe(450); // 18% of 2500
  });

  it('with 0% commission the clinic receives the full consultation fee', () => {
    const b = computeBreakdown({ ...base, commissionPercent: 0 });
    expect(b.commissionPaise).toBe(0);
    expect(b.clinicAmountPaise).toBe(b.consultationFeePaise);
  });
});
