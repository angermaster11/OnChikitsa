# Database & Index Reference

MongoDB (Mongoose 8). All timestamps are UTC. All list queries paginate at the DB level
(`skip`/`limit`, max limit 100) and sort by `createdAt` descending unless noted.

Field-level `unique: true` is used for uniqueness (it creates the index); those are **not**
repeated as `schema.index()` calls to avoid duplicate-index warnings.

---

## Collections

### `admins` — staff accounts (SUPER_ADMIN / ADMIN / SUPPORT)
| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | required |
| `email` | string | **unique**, lowercased |
| `phone` | string | optional |
| `passwordHash` | string | Argon2id, `select:false` |
| `role` | enum | SUPER_ADMIN \| ADMIN \| SUPPORT |
| `permissions` | string[] | explicit overrides; empty ⇒ role defaults |
| `status` | enum | ACTIVE \| DISABLED |
| `lastLoginAt`, `lastLoginIp` | | login telemetry |
| `failedLoginAttempts`, `lockUntil` | | lockout state |
| `createdBy`, `updatedBy` | ObjectId → Admin | audit of staff changes |

Indexes: `email` (unique), `{ role: 1, status: 1 }`.

### `users` — patients
| Field | Type | Notes |
| --- | --- | --- |
| `firebaseUid` | string | **unique** |
| `name`, `phone` | string | phone required |
| `email` | string | optional (sparse unique) |
| `gender`, `dob`, `height`, `weight` | | profile |
| `status` | enum | ACTIVE \| BANNED \| DELETED |
| `bannedAt`, `bannedBy`, `banReason` | | moderation |
| `deletedAt`, `deletedBy` | | soft delete |

Indexes: `firebaseUid` (unique), `phone`, `email` (sparse), `{ status: 1, createdAt: -1 }`, `createdAt`, text on `name`.

### `clinics`
| Field | Type | Notes |
| --- | --- | --- |
| `firebaseUid` | string | **unique** |
| `name`, `phone1` | string | required |
| `phone2`, `email` | string | optional |
| `yearsOld`, `banner`, `logo`, `description`, `specification` | | profile |
| `consultationFee`, `averageConsultationTime` | number | |
| `status` | enum | ACTIVE \| CLOSED \| BOOKING_FULL \| BANNED \| DELETED |
| ban/delete fields | | as users |

Indexes: `firebaseUid` (unique), `phone1`, `email` (sparse), `{ status: 1, createdAt: -1 }`, `createdAt`, text on `name`.

### `doctors`
| Field | Type | Notes |
| --- | --- | --- |
| `clinicId` | ObjectId → Clinic | owning clinic |
| `name` | string | required |
| `qualification`, `specialization`, `age`, `gender`, `email`, `phone` | | profile |
| `status` | enum | ACTIVE \| INACTIVE \| DELETED |
| `deletedAt`, `deletedBy` | | soft delete |

Indexes: `{ clinicId: 1, status: 1 }`, `status`, `createdAt`. `clinicId` is modelled as a reference to
keep a future many-to-many (doctor across clinics) migration open.

### `support_tickets`
| Field | Type | Notes |
| --- | --- | --- |
| `subject`, `message` | string | required |
| `status` | enum | OPEN \| PENDING \| RESOLVED \| CLOSED (default OPEN) |
| `priority` | enum | LOW \| MEDIUM \| HIGH (default MEDIUM) |
| `raisedByType`, `raisedById`, `raisedByName` | | USER or CLINIC origin |
| `assignedTo` | ObjectId → Admin | staff owner |
| `responses[]` | subdoc[] | `{ authorId, authorName, authorRole, message, createdAt }` |

Indexes: `{ status: 1, createdAt: -1 }`, `{ raisedByType: 1, raisedById: 1 }`, `{ assignedTo: 1 }`, `createdAt`.

### `auditlogs` — immutable
| Field | Type | Notes |
| --- | --- | --- |
| `actorId`, `actorRole`, `actorName`, `actorEmail` | | **who** did it (always captured) |
| `action` | enum | canonical action list |
| `targetType`, `targetId`, `targetName` | | **what** it acted on |
| `description`, `metadata` | | human text + structured extras |
| `ipAddress`, `userAgent` | | request context |
| `createdAt` | date | **no `updatedAt`** — append only |

Update/delete are blocked by pre-hooks. Indexes: `createdAt`, `{ actorId, createdAt }`,
`{ actorRole, createdAt }`, `{ action, createdAt }`, `{ targetType, targetId, createdAt }`.

### `refreshtokens`
| Field | Type | Notes |
| --- | --- | --- |
| `adminId` | ObjectId → Admin | owner |
| `tokenHash` | string | SHA-256 of the JWT (never the raw token) |
| `expiresAt` | date | **TTL index** (auto-expiry) |
| `revokedAt`, `replacedByTokenId` | | rotation / reuse detection |
| `createdByIp`, `userAgent` | | issue context |

Indexes: `tokenHash`, `adminId`, TTL `{ expiresAt: 1 }` (expireAfterSeconds 0).

---

## Index build policy
`autoIndex` is **on** outside production (dev/test convenience) and **off** in production —
build indexes deliberately during deploy/migration to avoid surprise foreground builds under load.
