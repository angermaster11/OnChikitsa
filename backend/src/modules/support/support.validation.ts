import { z } from 'zod';
import { paginationQuerySchema, objectIdSchema } from '../../utils/validators';
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_CATEGORY, RAISED_BY_TYPE } from './supportTicket.model';

/** Staff list query: pagination + status/priority/raiser/category + free-text search. */
export const listTicketsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(TICKET_STATUS).optional(),
  priority: z.nativeEnum(TICKET_PRIORITY).optional(),
  raisedByType: z.nativeEnum(RAISED_BY_TYPE).optional(),
  category: z.nativeEnum(TICKET_CATEGORY).optional(),
  search: z.string().trim().min(1).max(160).optional(),
});

/** Payload for an app account opening a ticket (identity comes from the token). */
export const createTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(5000),
    priority: z.nativeEnum(TICKET_PRIORITY).default(TICKET_PRIORITY.MEDIUM),
    category: z.nativeEnum(TICKET_CATEGORY).optional(),
    attachments: z.array(z.string().url()).max(5).optional(),
  })
  .strict();

/** A single staff reply appended to a ticket. */
export const respondSchema = z
  .object({
    message: z.string().trim().min(1).max(5000),
  })
  .strict();

/** Fields a staff member may edit on a ticket. `assignedTo` null unassigns it. */
export const updateTicketSchema = z
  .object({
    status: z.nativeEnum(TICKET_STATUS).optional(),
    priority: z.nativeEnum(TICKET_PRIORITY).optional(),
    assignedTo: objectIdSchema.nullable().optional(),
  })
  .strict();

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketBody = z.infer<typeof createTicketSchema>;
export type RespondBody = z.infer<typeof respondSchema>;
export type UpdateTicketBody = z.infer<typeof updateTicketSchema>;
