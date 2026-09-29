import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { appointmentService } from './appointment.service';
import type {
  CreateBookingBody,
  ListMyBookingsQuery,
  ListClinicAppointmentsQuery,
  UpdateAppointmentStatusBody,
} from './appointment.validation';

function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const appointmentController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const appt = await appointmentService.createBooking(actor.id, req.body as CreateBookingBody);
    sendSuccess(res, appt, 'Appointment booked', 201);
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListMyBookingsQuery;
    const { items, pagination } = await appointmentService.listMyBookings(actor.id, q.scope, q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const appt = await appointmentService.cancelBooking(actor.id, req.params.id);
    sendSuccess(res, appt, 'Appointment cancelled');
  }),

  // ---- Clinic-facing ----
  listForClinic: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListClinicAppointmentsQuery;
    const { items, pagination } = await appointmentService.listForClinic(
      actor.id,
      { date: q.date, status: q.status },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getForClinic: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const appt = await appointmentService.getForClinic(actor.id, req.params.id);
    sendSuccess(res, appt, 'Appointment retrieved');
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { status } = req.body as UpdateAppointmentStatusBody;
    const appt = await appointmentService.clinicUpdateStatus(actor.id, req.params.id, status);
    sendSuccess(res, appt, 'Appointment updated');
  }),
};
