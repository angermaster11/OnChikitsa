import { z } from 'zod';
import { DOCTOR_STATUS, GENDER } from '../../utils/constants';
import { paginationQuerySchema, phoneSchema, objectIdSchema } from '../../utils/validators';

/** Admin list query: pagination + clinic/status/search filters. */
export const listDoctorsQuerySchema = paginationQuerySchema.extend({
  clinicId: objectIdSchema.optional(),
  status: z.nativeEnum(DOCTOR_STATUS).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

/** Doctor payload for the Clinic app — the owning clinic is derived from the
 *  authenticated actor, never from the body. The profile photo is OPTIONAL. */
export const createDoctorSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    qualification: z.string().trim().max(200).optional(),
    specialization: z.string().trim().max(200).optional(),
    age: z.number().min(0).optional(),
    gender: z.nativeEnum(GENDER).optional(),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    photo: z.string().optional(),
    experience: z.number().min(0).max(80).optional(),
    registrationNo: z.string().trim().max(100).optional(),
    consultationFee: z.number().min(0).optional(),
  })
  .strict();

/** Admin create additionally requires the target clinic id. */
export const adminCreateDoctorSchema = createDoctorSchema.extend({
  clinicId: objectIdSchema,
});

/** Editable fields on a doctor. Status is limited to ACTIVE|INACTIVE — DELETED is
 *  reached only through the delete endpoint (soft delete). */
export const updateDoctorSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    qualification: z.string().trim().max(200).optional(),
    specialization: z.string().trim().max(200).optional(),
    age: z.number().min(0).optional(),
    gender: z.nativeEnum(GENDER).optional(),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    photo: z.string().optional(),
    experience: z.number().min(0).max(80).optional(),
    registrationNo: z.string().trim().max(100).optional(),
    consultationFee: z.number().min(0).optional(),
    status: z.enum([DOCTOR_STATUS.ACTIVE, DOCTOR_STATUS.INACTIVE]).optional(),
  })
  .strict();

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
export type CreateDoctorBody = z.infer<typeof createDoctorSchema>;
export type AdminCreateDoctorBody = z.infer<typeof adminCreateDoctorSchema>;
export type UpdateDoctorBody = z.infer<typeof updateDoctorSchema>;
