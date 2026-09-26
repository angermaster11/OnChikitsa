import { AuditLog } from '../../src/modules/audit/auditLog.model';
import { ROLES, TARGET_TYPE } from '../../src/utils/constants';
import { AUDIT_ACTIONS } from '../../src/utils/auditActions';

/** Audit logs must be immutable — no update/delete path may succeed. */
describe('AuditLog immutability', () => {
  function seed() {
    return AuditLog.create({
      actorId: null,
      actorRole: ROLES.SUPER_ADMIN,
      actorName: 'Tester',
      action: AUDIT_ACTIONS.USER_BANNED,
      targetType: TARGET_TYPE.USER,
    });
  }

  it('rejects updateOne', async () => {
    const log = await seed();
    await expect(AuditLog.updateOne({ _id: log._id }, { actorName: 'X' })).rejects.toThrow(/immutable/);
  });

  it('rejects deleteOne and leaves the record intact', async () => {
    const log = await seed();
    await expect(AuditLog.deleteOne({ _id: log._id })).rejects.toThrow(/immutable/);
    expect(await AuditLog.countDocuments()).toBe(1);
  });

  it('rejects findOneAndUpdate', async () => {
    await seed();
    await expect(AuditLog.findOneAndUpdate({}, { actorName: 'Y' })).rejects.toThrow(/immutable/);
  });
});
