import { z } from 'zod';
import { GENDER, USER_STATUS, ONBOARDING_STATUS, PERMISSION_STATUS } from '../../utils/constants';
import { paginationQuerySchema, dateRangeQuerySchema, phoneSchema } from '../../utils/validators';

/** Device location captured when the user grants the location permission. */
export const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
  })
  .strict();

/** Admin list query: pagination + search + filters. */
export const listUsersQuerySchema = paginationQuerySchema.merge(dateRangeQuerySchema).extend({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(USER_STATUS).optional(),
  gender: z.nativeEnum(GENDER).optional(),
});

/** Fields an admin may edit on a user. Status/ban fields are NOT editable here —
 *  those go through the dedicated ban/unban endpoints so they are always audited. */
export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().email().optional(),
    gender: z.nativeEnum(GENDER).optional(),
    dob: z.coerce.date().optional(),
    height: z.number().positive().max(300).optional(),
    weight: z.number().positive().max(700).optional(),
  })
  .strict();

export const banSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

/** Self-registration payload for the User app (identity comes from the token).
 *  Only name + phone are required — the account is created straight after phone
 *  verification and demographics are filled in later via PATCH /me. */
export const registerUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    gender: z.nativeEnum(GENDER).optional(),
    dob: z.coerce.date().optional(),
    email: z.string().email().optional(),
    height: z.number().positive().max(300).optional(),
    weight: z.number().positive().max(700).optional(),
    notificationPermission: z.nativeEnum(PERMISSION_STATUS).optional(),
    locationPermission: z.nativeEnum(PERMISSION_STATUS).optional(),
    location: locationSchema.optional(),
  })
  .strict();

/** Self profile update for the User app — demographics plus the onboarding /
 *  permission mirrors written as the user moves through the funnel. */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().email().optional(),
    gender: z.nativeEnum(GENDER).optional(),
    dob: z.coerce.date().optional(),
    height: z.number().positive().max(300).optional(),
    weight: z.number().positive().max(700).optional(),
    onboardingStatus: z.nativeEnum(ONBOARDING_STATUS).optional(),
    notificationPermission: z.nativeEnum(PERMISSION_STATUS).optional(),
    locationPermission: z.nativeEnum(PERMISSION_STATUS).optional(),
    location: locationSchema.optional(),
  })
  .strict();

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type AdminUpdateUserBody = z.infer<typeof adminUpdateUserSchema>;
export type BanBody = z.infer<typeof banSchema>;
export type RegisterUserBody = z.infer<typeof registerUserSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
