import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { idParamSchema } from '../../utils/validators';
import { appointmentController } from './appointment.controller';
import { createBookingSchema, listMyBookingsQuerySchema, listClinicAppointmentsQuerySchema, updateAppointmentStatusSchema, skipAppointmentSchema, rebookLookupSchema, rebookSchema } from './appointment.validation';

/** Patient booking endpoints — mounted at /api/v1/user/bookings (Firebase USER). */
export const userBookingRoutes = Router();
userBookingRoutes.use(firebaseAuth('USER'));

userBookingRoutes.post('/', validate({ body: createBookingSchema }), appointmentController.create);
userBookingRoutes.get('/', validate({ query: listMyBookingsQuerySchema }), appointmentController.listMine);
userBookingRoutes.post('/rebook/lookup', validate({ body: rebookLookupSchema }), appointmentController.rebookLookup);
userBookingRoutes.post('/rebook', validate({ body: rebookSchema }), appointmentController.rebook);
userBookingRoutes.post('/:id/cancel', validate({ params: idParamSchema }), appointmentController.cancel);

/** Clinic-facing appointment management — mounted at /api/v1/clinic/appointments.
 *  Every route is scoped to the authenticated clinic (clinicId from the token). */
export const clinicAppointmentRoutes = Router();
clinicAppointmentRoutes.use(firebaseAuth('CLINIC'));

clinicAppointmentRoutes.get('/', validate({ query: listClinicAppointmentsQuerySchema }), appointmentController.listForClinic);
clinicAppointmentRoutes.get('/:id', validate({ params: idParamSchema }), appointmentController.getForClinic);
clinicAppointmentRoutes.patch('/:id/status', validate({ params: idParamSchema, body: updateAppointmentStatusSchema }), appointmentController.updateStatus);
clinicAppointmentRoutes.patch('/:id/skip', validate({ params: idParamSchema, body: skipAppointmentSchema }), appointmentController.skip);
