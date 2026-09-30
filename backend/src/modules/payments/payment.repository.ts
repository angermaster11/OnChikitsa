import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { Transaction, type TransactionDoc } from './payment.model';

export interface TransactionListFilters {
  clinicId?: string;
  userId?: string;
  status?: string;
  settlementStatus?: string;
  search?: string;
  /** Inclusive createdAt range (period filters: today / month / year / custom day). */
  from?: Date;
  to?: Date;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Populated onto list/detail reads so admin tables can show the appointment slot. */
const APPOINTMENT_FIELDS = 'date slotStart slotEnd status tokenNo';

/** Data-access layer for transactions. Query construction lives here, out of services. */
export const paymentRepository = {
  buildFilter(filters: TransactionListFilters): FilterQuery<TransactionDoc> {
    const query: FilterQuery<TransactionDoc> = {};
    if (filters.clinicId && Types.ObjectId.isValid(filters.clinicId)) {
      query.clinicId = new Types.ObjectId(filters.clinicId);
    }
    if (filters.userId && Types.ObjectId.isValid(filters.userId)) {
      query.userId = new Types.ObjectId(filters.userId);
    }
    if (filters.status) query.status = filters.status;
    if (filters.settlementStatus) query['settlement.status'] = filters.settlementStatus;
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = filters.from;
      if (filters.to) range.$lte = filters.to;
      query.createdAt = range;
    }
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [
        { razorpayOrderId: rx },
        { razorpayPaymentId: rx },
        { clinicName: rx },
        { 'contact.name': rx },
        { 'contact.phone': rx },
      ];
    }
    return query;
  },

  async list(
    filter: FilterQuery<TransactionDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: TransactionDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('appointmentId', APPOINTMENT_FIELDS)
        .lean<TransactionDoc[]>(),
      Transaction.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string, session?: ClientSession | null): Promise<TransactionDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Transaction.findById(id)
      .session(session ?? null)
      .exec();
  },

  /** Admin detail read: same as findById but with the appointment slot populated. */
  findByIdWithAppointment(id: string): Promise<TransactionDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Transaction.findById(id).populate('appointmentId', APPOINTMENT_FIELDS).exec();
  },

  /** Look a transaction up by the Razorpay order id we created for it (`order_…`). */
  findByRazorpayOrderId(
    orderId: string,
    session?: ClientSession | null,
  ): Promise<TransactionDoc | null> {
    return Transaction.findOne({ razorpayOrderId: orderId })
      .session(session ?? null)
      .exec();
  },

  findByAppointmentId(
    appointmentId: string,
    session?: ClientSession | null,
  ): Promise<TransactionDoc | null> {
    if (!Types.ObjectId.isValid(appointmentId)) return Promise.resolve(null);
    return Transaction.findOne({ appointmentId: new Types.ObjectId(appointmentId) })
      .session(session ?? null)
      .exec();
  },

  create(data: Partial<TransactionDoc>, session?: ClientSession | null): Promise<TransactionDoc> {
    return Transaction.create([data], { session: session ?? undefined }).then((docs) => docs[0]!);
  },
};
