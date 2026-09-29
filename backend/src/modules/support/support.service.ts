import { Types } from 'mongoose';
import { NotFoundError, ERROR_CODES } from '../../utils/errors';
import { ROLES } from '../../utils/constants';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { supportRepository, type SupportTicketListFilters } from './support.repository';
import {
  TICKET_STATUS,
  RAISED_BY_TYPE,
  type SupportTicketDoc,
  type RaisedByType,
} from './supportTicket.model';
import type { AuthActor } from '../../types/auth';
import type { CreateTicketBody, UpdateTicketBody } from './support.validation';

/** Map an app actor's role onto the ticket's raiser type. */
function raiserTypeFor(actor: AuthActor): RaisedByType {
  return actor.role === ROLES.CLINIC ? RAISED_BY_TYPE.CLINIC : RAISED_BY_TYPE.USER;
}

export const supportService = {
  // ---- Staff-facing ----
  async list(
    filters: SupportTicketListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: SupportTicketDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = supportRepository.buildFilter(filters);
    const { items, total } = await supportRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<SupportTicketDoc> {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new NotFoundError(ERROR_CODES.NOT_FOUND, 'Support ticket not found');
    return ticket;
  },

  /** Append a staff reply. First reply on an OPEN ticket moves it to PENDING. */
  async respond(actor: AuthActor, id: string, message: string): Promise<SupportTicketDoc> {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new NotFoundError(ERROR_CODES.NOT_FOUND, 'Support ticket not found');
    ticket.responses.push({
      authorId: new Types.ObjectId(actor.id),
      authorName: actor.name,
      authorRole: actor.role,
      message,
      createdAt: new Date(),
    });
    if (ticket.status === TICKET_STATUS.OPEN) ticket.status = TICKET_STATUS.PENDING;
    await ticket.save();
    return ticket;
  },

  async update(_actor: AuthActor, id: string, data: UpdateTicketBody): Promise<SupportTicketDoc> {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new NotFoundError(ERROR_CODES.NOT_FOUND, 'Support ticket not found');
    if (data.status !== undefined) ticket.status = data.status;
    if (data.priority !== undefined) ticket.priority = data.priority;
    if (data.assignedTo !== undefined) {
      ticket.assignedTo = data.assignedTo ? new Types.ObjectId(data.assignedTo) : null;
    }
    await ticket.save();
    return ticket;
  },

  // ---- App-facing (Firebase) ----
  /** Open a ticket on behalf of the authenticated USER/CLINIC. No audit log. */
  async createByApp(actor: AuthActor, data: CreateTicketBody): Promise<SupportTicketDoc> {
    return supportRepository.create({
      subject: data.subject,
      message: data.message,
      priority: data.priority,
      category: data.category,
      attachments: data.attachments ?? [],
      raisedByType: raiserTypeFor(actor),
      raisedById: new Types.ObjectId(actor.id),
      raisedByName: actor.name,
    });
  },

  async listMine(
    actor: AuthActor,
    page?: number,
    limit?: number,
  ): Promise<{ items: SupportTicketDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const { items, total } = await supportRepository.findByRaiser(raiserTypeFor(actor), actor.id, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  /** One of the caller's own tickets. 404s (never 403) so ticket existence stays hidden. */
  async getMine(actor: AuthActor, id: string): Promise<SupportTicketDoc> {
    const ticket = await supportRepository.findById(id);
    if (
      !ticket ||
      ticket.raisedByType !== raiserTypeFor(actor) ||
      String(ticket.raisedById) !== actor.id
    ) {
      throw new NotFoundError(ERROR_CODES.NOT_FOUND, 'Support ticket not found');
    }
    return ticket;
  },

  /** Append a reply from the ticket's own raiser. Status is left untouched. */
  async respondAsRaiser(actor: AuthActor, id: string, message: string): Promise<SupportTicketDoc> {
    const ticket = await this.getMine(actor, id);
    ticket.responses.push({
      authorId: new Types.ObjectId(actor.id),
      authorName: actor.name,
      authorRole: actor.role,
      message,
      createdAt: new Date(),
    });
    await ticket.save();
    return ticket;
  },
};
