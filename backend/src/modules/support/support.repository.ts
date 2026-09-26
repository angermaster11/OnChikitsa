import { Types, type FilterQuery } from 'mongoose';
import { SupportTicket, type SupportTicketDoc } from './supportTicket.model';
import type { TicketStatus, TicketPriority, RaisedByType } from './supportTicket.model';

export interface SupportTicketListFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Data-access layer for support tickets. Query construction lives here. */
export const supportRepository = {
  buildFilter(filters: SupportTicketListFilters): FilterQuery<SupportTicketDoc> {
    const query: FilterQuery<SupportTicketDoc> = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ subject: rx }, { message: rx }, { raisedByName: rx }];
    }
    return query;
  },

  async list(
    filter: FilterQuery<SupportTicketDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: SupportTicketDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<SupportTicketDoc[]>(),
      SupportTicket.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string): Promise<SupportTicketDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return SupportTicket.findById(id).exec();
  },

  create(data: Partial<SupportTicketDoc>): Promise<SupportTicketDoc> {
    return SupportTicket.create(data);
  },

  async findByRaiser(
    type: RaisedByType,
    id: string,
    skip: number,
    limit: number,
  ): Promise<{ items: SupportTicketDoc[]; total: number }> {
    const filter: FilterQuery<SupportTicketDoc> = {
      raisedByType: type,
      raisedById: new Types.ObjectId(id),
    };
    const [items, total] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<SupportTicketDoc[]>(),
      SupportTicket.countDocuments(filter),
    ]);
    return { items, total };
  },

  countByStatus(status: TicketStatus): Promise<number> {
    return SupportTicket.countDocuments({ status });
  },
};
