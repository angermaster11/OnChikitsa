import { Types } from 'mongoose';
import { Clinic } from '../../src/modules/clinics/clinic.model';
import { Appointment } from '../../src/modules/appointments/appointment.model';
import { appointmentService } from '../../src/modules/appointments/appointment.service';
import { appointmentRepository } from '../../src/modules/appointments/appointment.repository';
import { CLINIC_STATUS } from '../../src/utils/constants';
import { ERROR_CODES } from '../../src/utils/errors';
import { todayStr, addDaysToDateStr } from '../../src/modules/appointments/slots';
import type { CreateBookingBody } from '../../src/modules/appointments/appointment.validation';

/**
 * Overbooking guard under concurrency. The in-memory Mongo used by the suite is a
 * STANDALONE server (no transactions), which is exactly the topology where the old
 * count-then-insert had zero protection — so these tests prove the atomic `seatKey`
 * unique index holds the line regardless of transactions.
 */
const WINDOW = [{ start: '09:00', end: '17:00' }];
const DATE = addDaysToDateStr(todayStr(), 2); // a near-future, always-open day
const SLOT = { slotStart: '09:00', slotEnd: '09:30' };

async function makeClinic(capacity: number) {
  return Clinic.create({
    firebaseUid: `clinic-${new Types.ObjectId().toHexString()}`,
    name: 'Test Clinic',
    phone1: '+15551230000',
    status: CLINIC_STATUS.ACTIVE,
    consultationFee: 500,
    slotConfiguration: {
      slotDurationMin: 30,
      breakBetweenSlotsMin: 0,
      maxPatientsPerSlot: capacity,
      advanceBookingDays: 30,
      sameDayBooking: true,
      bookingEnabled: true,
    },
    weeklyHours: { sun: WINDOW, mon: WINDOW, tue: WINDOW, wed: WINDOW, thu: WINDOW, fri: WINDOW, sat: WINDOW },
  });
}

function bookingBody(clinicId: string): CreateBookingBody {
  return {
    clinicId,
    date: DATE,
    slotStart: SLOT.slotStart,
    slotEnd: SLOT.slotEnd,
    patient: { name: 'Patient', phone: '+15551112222' },
  };
}

const occupancy = (clinicId: string) =>
  appointmentRepository.countInSlot(clinicId, DATE, SLOT.slotStart);

describe('booking overbooking guard (concurrency)', () => {
  // Ensure the seatKey unique index is actually built before racing inserts.
  beforeAll(async () => {
    await Appointment.init();
  });

  it('admits exactly one booking into a capacity-1 slot under a concurrent burst', async () => {
    const clinic = await makeClinic(1);
    const id = String(clinic._id);
    const userIds = Array.from({ length: 6 }, () => new Types.ObjectId().toHexString());

    const results = await Promise.allSettled(
      userIds.map((uid) => appointmentService.createBooking(uid, bookingBody(id))),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(5);
    for (const r of rejected) {
      expect(r.reason).toMatchObject({ code: ERROR_CODES.SLOT_FULL });
    }
    expect(await occupancy(id)).toBe(1);
  });

  it('admits exactly `capacity` bookings when more race than seats', async () => {
    const clinic = await makeClinic(3);
    const id = String(clinic._id);
    const userIds = Array.from({ length: 8 }, () => new Types.ObjectId().toHexString());

    const results = await Promise.allSettled(
      userIds.map((uid) => appointmentService.createBooking(uid, bookingBody(id))),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled');

    expect(fulfilled).toHaveLength(3);
    expect(await occupancy(id)).toBe(3);
  });

  it('frees the seat for another patient after a cancellation', async () => {
    const clinic = await makeClinic(1);
    const id = String(clinic._id);
    const u1 = new Types.ObjectId().toHexString();
    const u2 = new Types.ObjectId().toHexString();

    const appt = await appointmentService.createBooking(u1, bookingBody(id));
    // Slot is now full for everyone else.
    await expect(appointmentService.createBooking(u2, bookingBody(id))).rejects.toMatchObject({
      code: ERROR_CODES.SLOT_FULL,
    });
    // Cancelling u1 frees the seat (seatKey cleared) so u2 can claim it.
    await appointmentService.cancelBooking(u1, String(appt._id));
    const appt2 = await appointmentService.createBooking(u2, bookingBody(id));

    expect(appt2).toBeTruthy();
    expect(await occupancy(id)).toBe(1);
  });
});
