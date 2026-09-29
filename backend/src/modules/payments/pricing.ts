import { GST_BASE, type GstBase } from '../../utils/constants';

/**
 * Pricing engine — the SINGLE SOURCE OF TRUTH for how a booking total is built
 * and split. Pure and framework-free so it can be reused by the user quote, the
 * order-creation flow, and the stored Payment snapshot, and unit-tested in
 * isolation. ALL money is integer paise.
 *
 * The model (₹500 fee, ₹25 platform fee, 10% commission, 18% GST as an example):
 *   consultationFeePaise = 50000
 *   platformFeePaise     =  2500                       (flat, from settings)
 *   commissionPaise      =  5000  (10% of consultation fee — the platform's cut)
 *   gstBasePaise         =  7500  (platform fee + commission; consultation is GST-exempt)
 *   gstPaise             =  1350  (18% of gstBase)
 *   totalPaise           = 53850  (what the user pays: fee + platform fee + GST)
 *   clinicAmountPaise    = 45000  (fee − commission — the clinic's "90% of fee" share)
 *   platformAmountPaise  =  8850  (total − clinic — what the platform keeps)
 *
 * The platform amount is DERIVED BY SUBTRACTION so integer rounding can never
 * leak or double-count a paisa: clinic + platform always equals total exactly.
 */
export interface PricingInputs {
  /** Consultation fee in paise (round the clinic's rupee fee before passing). */
  consultationFeePaise: number;
  /** Flat platform fee in paise (from pricing settings). */
  platformFeePaise: number;
  /** Platform's cut of the consultation fee, as a percentage (per-clinic or default). */
  commissionPercent: number;
  /** GST percentage. */
  gstRate: number;
  /** Which amount GST is levied on. */
  gstBase: GstBase;
  currency: string;
}

export interface PriceBreakdown {
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  commissionPercent: number;
  gstBasePaise: number;
  gstRate: number;
  gstBase: GstBase;
  gstPaise: number;
  totalPaise: number;
  /** The clinic's share (fee − commission); settled to the clinic offline by the admin. */
  clinicAmountPaise: number;
  /** Amount retained by the platform (derived: total − clinic). */
  platformAmountPaise: number;
  currency: string;
}

/** Convert a rupee amount (e.g. clinic.consultationFee) to integer paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Compute the full price breakdown from the pricing inputs. Pure + deterministic. */
export function computeBreakdown(input: PricingInputs): PriceBreakdown {
  const consultationFeePaise = Math.round(input.consultationFeePaise);
  const platformFeePaise = Math.round(input.platformFeePaise);
  const commissionPaise = Math.round((consultationFeePaise * input.commissionPercent) / 100);
  const gstBasePaise =
    input.gstBase === GST_BASE.PLATFORM_FEE ? platformFeePaise : platformFeePaise + commissionPaise;
  const gstPaise = Math.round((gstBasePaise * input.gstRate) / 100);
  const totalPaise = consultationFeePaise + platformFeePaise + gstPaise;
  const clinicAmountPaise = consultationFeePaise - commissionPaise;
  const platformAmountPaise = totalPaise - clinicAmountPaise;

  return {
    consultationFeePaise,
    platformFeePaise,
    commissionPaise,
    commissionPercent: input.commissionPercent,
    gstBasePaise,
    gstRate: input.gstRate,
    gstBase: input.gstBase,
    gstPaise,
    totalPaise,
    clinicAmountPaise,
    platformAmountPaise,
    currency: input.currency,
  };
}
