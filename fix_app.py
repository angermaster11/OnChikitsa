import re

with open('backend/src/modules/appointments/appointment.service.ts', 'r') as f:
    content = f.read()

# Replace createBookingOrder
create_match = re.search(r'  async createBookingOrder\(.*?return this\.startRazorpayOrder[^}]+},', content, re.DOTALL)
if not create_match:
    print("createBookingOrder not found")
else:
    new_create = """  async createBookingOrder(userId: string, body: CreateBookingBody): Promise<BookingOrderResult> {
    if (!isValidDateStr(body.date)) throw new ValidationError('Invalid date');

    const clinic = await clinicRepository.findById(body.clinicId);
    if (!clinic || !isVisibleToPatients(clinic)) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const consultationFeePaise = rupeesToPaise(clinic.consultationFee ?? 0);
    if (consultationFeePaise <= 0) {
      throw new AppError(422, ERROR_CODES.PAYMENT_ORDER_FAILED, 'This clinic has no consultation fee set');
    }

    const availability = await this.getAvailability(clinic, body.date);
    if (availability.reason && availability.reason !== 'FULL') throw reasonToError(availability.reason);
    const slot = availability.slots.find((s) => s.start === body.slotStart && s.end === body.slotEnd);
    if (!slot || slot.past) throw new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'That time slot is not available');
    if (slot.available <= 0) throw new ConflictError(ERROR_CODES.SLOT_FULL, 'That time slot is fully booked');

    const pricing = await settingsService.getPricing();
    const commissionPercent = clinic.commissionPercent ?? pricing.defaultCommissionPercent;
    const breakdown = computeBreakdown({
      consultationFeePaise,
      platformFeePaise: pricing.platformFeePaise,
      commissionPercent,
      gstRate: pricing.gstRate,
      gstBase: pricing.gstBase,
      currency: pricing.currency,
    });

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');

    const walletBalancePaise = user.walletBalancePaise || 0;
    const walletDeductionPaise = Math.min(walletBalancePaise, breakdown.totalPaise);
    
    breakdown.walletDeductionPaise = walletDeductionPaise;
    const amountToPayPaise = breakdown.totalPaise - walletDeductionPaise;

    return this.processBookingOrder(userId, body, clinic, breakdown, slot.capacity, amountToPayPaise);
  },"""
    content = content[:create_match.start()] + new_create + content[create_match.end():]

# Replace startRazorpayOrder
start_match = re.search(r'  async startRazorpayOrder\(.*?order\.currency,\n      \},\n    \};\n  \},', content, re.DOTALL)
if not start_match:
    print("startRazorpayOrder not found")
else:
    new_start = """  async processBookingOrder(
    userId: string,
    body: CreateBookingBody,
    clinic: ClinicDoc,
    breakdown: PriceBreakdown,
    slotCapacity: number,
    amountToPayPaise: number,
  ): Promise<BookingOrderResult> {
    const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS);
    const { currency, ...snapshot } = breakdown;
    const transactionId = new Types.ObjectId();

    if (amountToPayPaise > 0) {
      assertRazorpayConfigured();
      const order = await createOrder({
        amountPaise: amountToPayPaise,
        receipt: String(transactionId),
        notes: {
          clinicId: String(clinic._id),
          clinicName: clinic.name,
          patient: body.patient.name ?? '',
        },
      });

      const { appointmentId, paymentId } = await this.claimSeatWithPayment(
        userId, body, clinic, slotCapacity, holdExpiresAt,
        {
          _id: transactionId,
          razorpayOrderId: order.id,
          status: PAYMENT_STATUS.CREATED,
          amountPaise: amountToPayPaise,
          currency,
          breakdown: snapshot,
          clinicName: clinic.name,
          contact: { name: body.patient.name, phone: body.patient.phone },
          settlement: {
            status: SETTLEMENT_STATUS.PENDING,
            amountPaise: breakdown.clinicAmountPaise,
          },
        },
      );

      return {
        appointmentId,
        paymentId,
        amountPaise: amountToPayPaise,
        currency,
        breakdown,
        holdExpiresAt,
        clinic: { id: String(clinic._id), name: clinic.name },
        razorpay: {
          keyId: razorpayKeyId(),
          orderId: order.id,
          amountPaise: order.amountPaise,
          currency: order.currency,
        },
      };
    } else {
      const orderId = `wallet_${transactionId}`;
      const { appointmentId, paymentId } = await this.claimSeatWithPayment(
        userId, body, clinic, slotCapacity, holdExpiresAt,
        {
          _id: transactionId,
          razorpayOrderId: orderId,
          status: PAYMENT_STATUS.CREATED,
          amountPaise: 0,
          currency,
          breakdown: snapshot,
          clinicName: clinic.name,
          contact: { name: body.patient.name, phone: body.patient.phone },
          settlement: {
            status: SETTLEMENT_STATUS.PENDING,
            amountPaise: breakdown.clinicAmountPaise,
          },
        },
      );

      setImmediate(() => {
        import('../payments/payment.service').then(m => m.paymentService.confirmWalletPayment(paymentId)).catch(err => logger.error({ err, paymentId }, 'Failed to confirm wallet payment'));
      });

      return {
        appointmentId,
        paymentId,
        amountPaise: 0,
        currency,
        breakdown,
        holdExpiresAt,
        clinic: { id: String(clinic._id), name: clinic.name },
        razorpay: {
          keyId: razorpayKeyId() || 'dummy',
          orderId,
          amountPaise: 0,
          currency,
        }
      };
    }
  },"""
    content = content[:start_match.start()] + new_start + content[start_match.end():]

# Add userRepository import
if "import { userRepository }" not in content:
    content = content.replace("import { computeBreakdown, rupeesToPaise, type PriceBreakdown } from '../payments/pricing';", 
                              "import { computeBreakdown, rupeesToPaise, type PriceBreakdown } from '../payments/pricing';\nimport { userRepository } from '../users/user.repository';")

with open('backend/src/modules/appointments/appointment.service.ts', 'w') as f:
    f.write(content)
print("Done")
