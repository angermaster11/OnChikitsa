import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * Support ticket raised by an app account (USER or CLINIC) and worked by staff.
 * Status/priority enums are module-specific, so they are declared locally here
 * rather than in the shared constants file. `raisedByType` + `raisedById`
 * identify the app account that opened the ticket; `assignedTo` is the Admin
 * currently owning it. Every staff reply is appended to `responses`.
 */
export const TICKET_STATUS = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export const RAISED_BY_TYPE = {
  USER: 'USER',
  CLINIC: 'CLINIC',
} as const;
export type RaisedByType = (typeof RAISED_BY_TYPE)[keyof typeof RAISED_BY_TYPE];

/** Optional triage bucket chosen by the app account when opening a ticket. */
export const TICKET_CATEGORY = {
  PAYMENTS: 'PAYMENTS',
  BOOKINGS: 'BOOKINGS',
  TECHNICAL: 'TECHNICAL',
  OTHER: 'OTHER',
} as const;
export type TicketCategory = (typeof TICKET_CATEGORY)[keyof typeof TICKET_CATEGORY];

/** One reply on a ticket. Author is captured at write time (id, name, role). */
export interface TicketResponse {
  authorId: Types.ObjectId;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: Date;
}

export interface SupportTicketDoc extends Document<Types.ObjectId> {
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: TicketCategory;
  attachments: string[];
  raisedByType: RaisedByType;
  raisedById: Types.ObjectId;
  raisedByName?: string;
  assignedTo?: Types.ObjectId | null;
  responses: TicketResponse[];
  createdAt: Date;
  updatedAt: Date;
}

const ticketResponseSchema = new Schema<TicketResponse>(
  {
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new Schema<SupportTicketDoc>(
  {
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
      required: true,
    },
    category: { type: String, enum: Object.values(TICKET_CATEGORY) },
    attachments: { type: [String], default: [] },
    raisedByType: { type: String, enum: Object.values(RAISED_BY_TYPE), required: true },
    raisedById: { type: Schema.Types.ObjectId, required: true },
    raisedByName: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    responses: { type: [ticketResponseSchema], default: [] },
  },
  {
    collection: 'support_tickets',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes backing the common support-queue filters (status/queue, raiser, owner).
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ raisedByType: 1, raisedById: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ createdAt: -1 });

export const SupportTicket: Model<SupportTicketDoc> = model<SupportTicketDoc>(
  'SupportTicket',
  supportTicketSchema,
);
