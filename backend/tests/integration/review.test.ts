import { Types } from 'mongoose';
import { Clinic } from '../../src/modules/clinics/clinic.model';
import { Appointment } from '../../src/modules/appointments/appointment.model';
import { reviewService } from '../../src/modules/reviews/review.service';
import { APPOINTMENT_STATUS, CLINIC_STATUS } from '../../src/utils/constants';

/** Create a clinic and an appointment in the given status for a given user. */
async function seed(opts: { userId: Types.ObjectId; status?: string }) {
  const clinic = await Clinic.create({
    firebaseUid: `c-${new Types.ObjectId().toHexString()}`,
    name: 'Test Clinic',
    phone1: '+15551230000',
    status: CLINIC_STATUS.ACTIVE,
  });
  const appt = await Appointment.create({
    clinicId: clinic._id,
    userId: opts.userId,
    date: '2026-01-01',
    slotStart: '09:00',
    slotEnd: '09:30',
    tokenNo: 1,
    status: opts.status ?? APPOINTMENT_STATUS.COMPLETED,
    patient: { name: 'Pat', phone: '+15551112222' },
    clinicName: clinic.name,
  });
  return { clinic, appt };
}

const freshClinicRating = async (id: Types.ObjectId) => {
  const c = await Clinic.findById(id).lean<{ ratingAvg?: number; ratingCount?: number }>();
  return { avg: c?.ratingAvg ?? 0, count: c?.ratingCount ?? 0 };
};

describe('reviewService', () => {
  it('records a review for a completed appointment and updates the clinic average', async () => {
    const userId = new Types.ObjectId();
    const { clinic, appt } = await seed({ userId });

    const review = await reviewService.createOrUpdate(String(userId), String(appt._id), { rating: 4, comment: 'Good' });
    expect(review.rating).toBe(4);
    // Never leaks the reviewer identity.
    expect(review).not.toHaveProperty('userId');

    const r = await freshClinicRating(clinic._id);
    expect(r).toEqual({ avg: 4, count: 1 });
  });

  it('rejects a review for a non-completed appointment', async () => {
    const userId = new Types.ObjectId();
    const { appt } = await seed({ userId, status: APPOINTMENT_STATUS.BOOKED });
    await expect(
      reviewService.createOrUpdate(String(userId), String(appt._id), { rating: 5 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it("rejects reviewing another patient's appointment (ownership)", async () => {
    const owner = new Types.ObjectId();
    const { appt } = await seed({ userId: owner });
    const stranger = new Types.ObjectId();
    await expect(
      reviewService.createOrUpdate(String(stranger), String(appt._id), { rating: 5 }),
    ).rejects.toMatchObject({ code: 'APPOINTMENT_NOT_FOUND' });
  });

  it('updates an existing review in place and re-adjusts the average (count unchanged)', async () => {
    const userId = new Types.ObjectId();
    const { clinic, appt } = await seed({ userId });
    await reviewService.createOrUpdate(String(userId), String(appt._id), { rating: 5 });
    await reviewService.createOrUpdate(String(userId), String(appt._id), { rating: 3 });

    const r = await freshClinicRating(clinic._id);
    expect(r).toEqual({ avg: 3, count: 1 });
  });

  it('averages multiple reviews for one clinic and lists them anonymously', async () => {
    const clinic = await Clinic.create({
      firebaseUid: `c-${new Types.ObjectId().toHexString()}`,
      name: 'Multi',
      phone1: '+15551230000',
      status: CLINIC_STATUS.ACTIVE,
    });
    const mkAppt = async () => {
      const u = new Types.ObjectId();
      const a = await Appointment.create({
        clinicId: clinic._id,
        userId: u,
        date: '2026-01-01',
        slotStart: '09:00',
        slotEnd: '09:30',
        tokenNo: 1,
        status: APPOINTMENT_STATUS.COMPLETED,
        patient: { name: 'Pat', phone: '+15551112222' },
        clinicName: clinic.name,
      });
      return { u, a };
    };
    const one = await mkAppt();
    const two = await mkAppt();
    await reviewService.createOrUpdate(String(one.u), String(one.a._id), { rating: 4, comment: 'A' });
    await reviewService.createOrUpdate(String(two.u), String(two.a._id), { rating: 2 });

    const r = await freshClinicRating(clinic._id);
    expect(r).toEqual({ avg: 3, count: 2 });

    const { items, pagination } = await reviewService.listForClinic(String(clinic._id), 1, 10);
    expect(pagination.total).toBe(2);
    expect(items).toHaveLength(2);
    for (const it of items) {
      expect(it).not.toHaveProperty('userId');
      expect(it).not.toHaveProperty('appointmentId');
      expect(typeof it.rating).toBe('number');
    }
  });
});
