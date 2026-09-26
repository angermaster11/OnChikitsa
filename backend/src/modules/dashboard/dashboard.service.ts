import { User } from '../users/user.model';
import { Clinic } from '../clinics/clinic.model';
import { Doctor } from '../doctors/doctor.model';
import { AuditLog } from '../audit/auditLog.model';
import { USER_STATUS, CLINIC_STATUS, DOCTOR_STATUS, ROLES } from '../../utils/constants';

const RECENT_WINDOW_DAYS = 7;
const RECENT_LIMIT = 10;

/**
 * Read-only aggregation for the admin dashboard. Every figure is computed with
 * `countDocuments` (never fetch-and-count-in-JS) and all queries are fired in
 * parallel via Promise.all so the endpoint stays a single round of DB work.
 */
export const dashboardService = {
  async getStats() {
    const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      usersActive,
      usersBanned,
      clinicsTotal,
      clinicsActive,
      clinicsClosed,
      clinicsBookingFull,
      clinicsBanned,
      doctorsTotal,
      newUsers,
      newClinics,
      recentAuditLogs,
      recentAdminActivity,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: USER_STATUS.ACTIVE }),
      User.countDocuments({ status: USER_STATUS.BANNED }),
      Clinic.countDocuments(),
      Clinic.countDocuments({ status: CLINIC_STATUS.ACTIVE }),
      Clinic.countDocuments({ status: CLINIC_STATUS.CLOSED }),
      Clinic.countDocuments({ status: CLINIC_STATUS.BOOKING_FULL }),
      Clinic.countDocuments({ status: CLINIC_STATUS.BANNED }),
      Doctor.countDocuments({ status: { $ne: DOCTOR_STATUS.DELETED } }),
      User.countDocuments({ createdAt: { $gte: since } }),
      Clinic.countDocuments({ createdAt: { $gte: since } }),
      AuditLog.find().sort({ createdAt: -1 }).limit(RECENT_LIMIT).lean(),
      AuditLog.find({ actorRole: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT] } })
        .sort({ createdAt: -1 })
        .limit(RECENT_LIMIT)
        .lean(),
    ]);

    return {
      users: { total: usersTotal, active: usersActive, banned: usersBanned },
      clinics: {
        total: clinicsTotal,
        active: clinicsActive,
        closed: clinicsClosed,
        bookingFull: clinicsBookingFull,
        banned: clinicsBanned,
      },
      doctors: { total: doctorsTotal },
      newUsers,
      newClinics,
      recentAuditLogs,
      recentAdminActivity,
    };
  },
};
