import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { Faq, type FaqDoc } from './faq.model';

export interface FaqListFilters {
  isActive?: boolean;
  search?: string;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Data-access layer for FAQs. Query construction lives here, out of services. */
export const faqRepository = {
  buildFilter(filters: FaqListFilters): FilterQuery<FaqDoc> {
    const query: FilterQuery<FaqDoc> = {};
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ question: rx }, { answer: rx }];
    }
    return query;
  },

  async list(
    filter: FilterQuery<FaqDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: FaqDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Faq.find(filter).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit).lean<FaqDoc[]>(),
      Faq.countDocuments(filter),
    ]);
    return { items, total };
  },

  /** Active FAQs for the app, ordered for display. No pagination — the set is small. */
  listActive(): Promise<FaqDoc[]> {
    return Faq.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean<FaqDoc[]>();
  },

  findById(id: string, session?: ClientSession | null): Promise<FaqDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Faq.findById(id)
      .session(session ?? null)
      .exec();
  },

  create(data: Partial<FaqDoc>): Promise<FaqDoc> {
    return Faq.create(data);
  },

  count(filter: FilterQuery<FaqDoc> = {}): Promise<number> {
    return Faq.countDocuments(filter);
  },
};
