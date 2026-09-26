# API Reference

Base URL: `/api/v1` · All responses use the standard envelope (see README).

**Auth headers**
- Staff endpoints: `Authorization: Bearer <accessToken>` (from `/admin/login`).
- App endpoints: `Authorization: Bearer <firebaseIdToken>`.

Common query params for list endpoints: `page` (≥1), `limit` (1–100), plus per-resource filters.

---

## Auth (staff)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/admin/login` | `{ email, password }` | Rate-limited. `data` = `{ admin, permissions: string[], accessToken, refreshToken }` (tokens are top-level in `data`, NOT nested). |
| POST | `/admin/refresh` | `{ refreshToken }` | Rotates the refresh token. `data` = `{ accessToken, refreshToken }`. |
| POST | `/admin/logout` | `{ refreshToken }` | Requires access token. Revokes the refresh token (idempotent). `data` = `null`. |
| GET | `/admin/me` | — | `data` = `{ id, name, email, role, permissions }`. |

Errors: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED`, `429 RATE_LIMITED`.

## Dashboard

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/dashboard/stats` | `DASHBOARD_VIEW` |

Returns user/clinic/doctor counts, new-signup counts (last 7 days), and recent audit/admin activity.

## Users (staff)

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/admin/users` | `USER_VIEW` | Filters: `search`, `status`, `gender`, `from`, `to`. |
| GET | `/admin/users/:id` | `USER_VIEW` | |
| PATCH | `/admin/users/:id` | `USER_UPDATE` | Profile fields only (not status/ban). Audited. |
| POST | `/admin/users/:id/ban` | `USER_BAN` | Body `{ reason }`. Transactional + audited; blocks the user. |
| POST | `/admin/users/:id/unban` | `USER_UNBAN` | Audited. |
| DELETE | `/admin/users/:id` | `USER_DELETE` | Soft delete. Audited. |

## Users (app / patient)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/user/register` | Firebase identity (USER) — first-time record creation |
| GET | `/user/me` | Firebase (USER) |
| PATCH | `/user/me` | Firebase (USER) — self profile update |

## Clinics (staff)

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/admin/clinics` | `CLINIC_VIEW` | Filters: `search`, `status`, `from`, `to`. Rows include `doctorsCount`. |
| GET | `/admin/clinics/:id` | `CLINIC_VIEW` | |
| PATCH | `/admin/clinics/:id` | `CLINIC_UPDATE` | Profile + operational status (ACTIVE/CLOSED/BOOKING_FULL). Audited. |
| POST | `/admin/clinics/:id/ban` | `CLINIC_BAN` | Body `{ reason }`. Transactional + audited. |
| POST | `/admin/clinics/:id/unban` | `CLINIC_UNBAN` | Audited. |
| DELETE | `/admin/clinics/:id` | `CLINIC_DELETE` | Soft delete. Audited. |

## Clinics (app)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/clinic/register` | Firebase identity (CLINIC) |
| GET | `/clinic/me` | Firebase (CLINIC) |
| PATCH | `/clinic/me` | Firebase (CLINIC) |

## Doctors

Staff (permissioned):

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/doctors` | `DOCTOR_VIEW` (filters: `clinicId`, `status`, `search`) |
| GET | `/admin/doctors/:id` | `DOCTOR_VIEW` |
| POST | `/admin/doctors` | `DOCTOR_CREATE` (body includes `clinicId`) |
| PATCH | `/admin/doctors/:id` | `DOCTOR_UPDATE` |
| DELETE | `/admin/doctors/:id` | `DOCTOR_DELETE` (soft) |

Clinic-owned (Firebase CLINIC, scoped to the authenticated clinic):

| Method | Path |
| --- | --- |
| GET | `/clinic/doctors` |
| POST | `/clinic/doctors` |
| PATCH | `/clinic/doctors/:id` |
| DELETE | `/clinic/doctors/:id` |

All create/update/delete actions write a `DOCTOR_*` audit record.

## Staff management (admins)

| Method | Path | Guard |
| --- | --- | --- |
| GET | `/admin/admins` | `ADMIN_VIEW` |
| GET | `/admin/admins/:id` | `ADMIN_VIEW` |
| POST | `/admin/admins` | service check: creating ADMIN needs `ADMIN_CREATE`, SUPPORT needs `SUPPORT_CREATE`; **SUPER_ADMIN cannot be created via API** |
| PATCH | `/admin/admins/:id` | service check per target role; SUPER_ADMIN is protected; optional password reset revokes sessions |
| POST | `/admin/admins/:id/disable` | service check; cannot disable self; revokes sessions |

## Support

Staff (`SUPPORT_VIEW`):

| Method | Path |
| --- | --- |
| GET | `/admin/support` (filters: `status`, `priority`, `search`) |
| GET | `/admin/support/:id` |
| POST | `/admin/support/:id/respond` (body `{ message }`) |
| PATCH | `/admin/support/:id` (status / priority / assignedTo) |

App:

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/user/support` | Firebase (USER) — raise a ticket |
| GET | `/user/support` | Firebase (USER) — list own tickets |
| POST | `/clinic/support` | Firebase (CLINIC) — raise a ticket |
| GET | `/clinic/support` | Firebase (CLINIC) — list own tickets |

## Audit logs (read-only)

| Method | Path | Permission | Filters |
| --- | --- | --- | --- |
| GET | `/admin/audit-logs` | `AUDIT_LOG_VIEW` | `actorId`, `actorRole`, `action`, `targetType`, `targetId`, `from`, `to` |
| GET | `/admin/audit-logs/:id` | `AUDIT_LOG_VIEW` | |

There is intentionally **no** create/update/delete audit endpoint.

---

## Error codes

`VALIDATION_ERROR` (400), `UNAUTHORIZED` / `INVALID_CREDENTIALS` / `INVALID_TOKEN` / `TOKEN_EXPIRED` (401),
`FORBIDDEN` / `ACCOUNT_BANNED` / `ACCOUNT_DISABLED` / `ACCOUNT_DELETED` / `PROTECTED_RESOURCE` (403),
`NOT_FOUND` / `*_NOT_FOUND` (404), `CONFLICT` / `ALREADY_BANNED` / `NOT_BANNED` / `EMAIL_TAKEN` (409),
`RATE_LIMITED` (429), `INTERNAL_ERROR` (500).
