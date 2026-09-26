import { z } from 'zod';
import { ADMIN_STATUS, ROLES } from '../../utils/constants';
import { PERMISSIONS } from '../../rbac/permissions';
import { paginationQuerySchema, phoneSchema } from '../../utils/validators';

// Only ADMIN and SUPPORT may be created/managed through the API — never a second
// SUPER_ADMIN. That role is created solely by the bootstrap script.
const manageableRole = z.enum([ROLES.ADMIN, ROLES.SUPPORT]);
const permissionSchema = z.nativeEnum(PERMISSIONS);

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[0-9]/, 'Must include a digit');

export const listAdminsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  role: manageableRole.or(z.literal(ROLES.SUPER_ADMIN)).optional(),
  status: z.nativeEnum(ADMIN_STATUS).optional(),
});

export const createAdminSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email(),
    phone: phoneSchema.optional(),
    role: manageableRole,
    password: strongPassword,
    permissions: z.array(permissionSchema).optional(),
  })
  .strict();

export const updateAdminSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    role: manageableRole.optional(),
    permissions: z.array(permissionSchema).optional(),
    status: z.nativeEnum(ADMIN_STATUS).optional(),
    password: strongPassword.optional(),
  })
  .strict();

export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
export type CreateAdminBody = z.infer<typeof createAdminSchema>;
export type UpdateAdminBody = z.infer<typeof updateAdminSchema>;
