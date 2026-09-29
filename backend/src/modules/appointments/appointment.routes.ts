import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { idParamSchema } from '../../utils/validators';
import { appointmentController } from './appointment.controller';
import { createBookingSchema, listMyBookingsQuerySchema, listClinicAppointmentsQuerySchema, updateAppointmentStatusSchema } from './appointment.validation';

/** Patient booking endpoints — mounted at /api/v1/user/bookings (Firebase USER). */
export const userBookingRoutes = Router();
userBookingRoutes.use(firebaseAuth('USER'));

userBookingRoutes.post('/', validate({ body: createBookingSchema }), appointmentController.create);
userBookingRoutes.get('/', validate({ query: listMyBookingsQuerySchema }), appointmentController.listMine);
userBookingRoutes.post('/:id/cancel', validate({ params: idParamSchema }), appointmentController.cancel);

/** Clinic-facing appointment management — mounted at /api/v1/clinic/appointments.
 *  Every route is scoped to the authenticated clinic (clinicId from the token). */
export const clinicAppointmentRoutes = Router();
clinicAppointmentRoutes.use(firebaseAuth('CLINIC'));

clinicAppointmentRoutes.get('/', validate({ query: listClinicAppointmentsQuerySchema }), appointmentController.listForClinic);
clinicAppointmentRoutes.get('/:id', validate({ params: idParamSchema }), appointmentController.getForClinic);
clinicAppointmentRoutes.patch('/:id/status', validate({ params: idParamSchema, body: updateAppointmentStatusSchema }), appointmentController.updateStatus);
