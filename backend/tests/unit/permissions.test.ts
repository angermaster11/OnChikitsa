import {
  resolvePermissions,
  PERMISSIONS,
  isValidPermission,
} from '../../src/rbac/permissions';
import { ROLES } from '../../src/utils/constants';

describe('resolvePermissions', () => {
  it('grants SUPER_ADMIN every permission, ignoring any overrides', () => {
    const all = Object.values(PERMISSIONS);
    expect(resolvePermissions(ROLES.SUPER_ADMIN)).toEqual(expect.arrayContaining(all));
    // An explicit (narrower) override must NOT shrink a Super Admin's power.
    expect(resolvePermissions(ROLES.SUPER_ADMIN, [PERMISSIONS.USER_VIEW])).toHaveLength(all.length);
  });

  it('gives ADMIN its defaults but never admin-management permissions', () => {
    const perms = resolvePermissions(ROLES.ADMIN);
    expect(perms).toContain(PERMISSIONS.USER_BAN);
    expect(perms).not.toContain(PERMISSIONS.ADMIN_CREATE);
  });

  it('gives SUPPORT read-only defaults (no ban)', () => {
    const perms = resolvePermissions(ROLES.SUPPORT);
    expect(perms).toContain(PERMISSIONS.USER_VIEW);
    expect(perms).not.toContain(PERMISSIONS.USER_BAN);
  });

  it('lets an explicit override replace ADMIN/SUPPORT defaults (least privilege)', () => {
    expect(resolvePermissions(ROLES.SUPPORT, [PERMISSIONS.USER_BAN])).toEqual([PERMISSIONS.USER_BAN]);
  });

  it('gives app roles (USER/CLINIC) no admin permissions', () => {
    expect(resolvePermissions(ROLES.USER)).toEqual([]);
    expect(resolvePermissions(ROLES.CLINIC)).toEqual([]);
  });

  it('validates permission strings', () => {
    expect(isValidPermission('USER_VIEW')).toBe(true);
    expect(isValidPermission('NONSENSE')).toBe(false);
  });
});
