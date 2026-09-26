import { NotFoundError, ERROR_CODES } from '../../utils/errors';
import { TARGET_TYPE } from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { auditService } from '../audit/audit.service';
import { faqRepository, type FaqListFilters } from './faq.repository';
import { Faq, type FaqDoc } from './faq.model';
import type { AuthActor } from '../../types/auth';
import type { CreateFaqBody, UpdateFaqBody } from './faq.validation';

interface Ctx {
  ip?: string;
  userAgent?: string;
}

export const faqService = {
  // ---- App-facing (public content) ----
  /** Active FAQs, ordered for display on the app's Support screen. */
  listActive(): Promise<FaqDoc[]> {
    return faqRepository.listActive();
  },

  // ---- Admin-facing ----
  async listForAdmin(
    filters: FaqListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: FaqDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = faqRepository.buildFilter(filters);
    const { items, total } = await faqRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<FaqDoc> {
    const faq = await faqRepository.findById(id);
    if (!faq) throw new NotFoundError(ERROR_CODES.FAQ_NOT_FOUND, 'FAQ not found');
    return faq;
  },

  async create(actor: AuthActor, data: CreateFaqBody, ctx: Ctx): Promise<FaqDoc> {
    const faq = await faqRepository.create({
      question: data.question,
      answer: data.answer,
      order: data.order,
      isActive: data.isActive,
    });

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.FAQ_CREATED,
      targetType: TARGET_TYPE.FAQ,
      targetId: faq._id,
      targetName: faq.question,
      description: `Created FAQ "${faq.question}"`,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return faq;
  },

  async update(actor: AuthActor, id: string, data: UpdateFaqBody, ctx: Ctx): Promise<FaqDoc> {
    const faq = await faqRepository.findById(id);
    if (!faq) throw new NotFoundError(ERROR_CODES.FAQ_NOT_FOUND, 'FAQ not found');
    if (data.question !== undefined) faq.question = data.question;
    if (data.answer !== undefined) faq.answer = data.answer;
    if (data.order !== undefined) faq.order = data.order;
    if (data.isActive !== undefined) faq.isActive = data.isActive;
    await faq.save();

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.FAQ_UPDATED,
      targetType: TARGET_TYPE.FAQ,
      targetId: faq._id,
      targetName: faq.question,
      description: `Updated FAQ "${faq.question}"`,
      metadata: { fields: Object.keys(data) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return faq;
  },

  async remove(actor: AuthActor, id: string, ctx: Ctx): Promise<FaqDoc> {
    const faq = await faqRepository.findById(id);
    if (!faq) throw new NotFoundError(ERROR_CODES.FAQ_NOT_FOUND, 'FAQ not found');
    await Faq.deleteOne({ _id: faq._id });

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.FAQ_DELETED,
      targetType: TARGET_TYPE.FAQ,
      targetId: faq._id,
      targetName: faq.question,
      description: `Deleted FAQ "${faq.question}"`,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return faq;
  },
};
