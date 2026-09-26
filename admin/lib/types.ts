/**
 * Shared TypeScript types for the OnChikitsa admin panel.
 * These mirror the backend API contract documented in backend/docs/API.md and
 * the module models. Resource entities are serialized with a Mongo `_id`; the
 * authenticated actor and staff (admin) records use `id`.
 */

// ── Enums (string unions matching backend constants) ──────────────────────
export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
export type Role = StaffRole | 'USER' | 'CLINIC';

export type AdminStatus = 'ACTIVE' | 'DISABLED';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'DELETED';
export type ClinicStatus = 'ACTIVE' | 'CLOSED' | 'BOOKING_FULL' | 'BANNED' | 'DELETED';
export type DoctorStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type AuthProvider = 'PHONE' | 'GOOGLE';
export type OnboardingStatus = 'PENDING' | 'COMPLETED';
export type PermissionStatus = 'PROMPT' | 'GRANTED' | 'DENIED';

export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RaisedByType = 'USER' | 'CLINIC';

export type TargetType = 'USER' | 'CLINIC' | 'DOCTOR' | 'ADMIN' | 'SUPPORT' | 'AUTH';

export type Permission =
  | 'USER_VIEW' | 'USER_UPDATE' | 'USER_BAN' | 'USER_UNBAN' | 'USER_DELETE'
  | 'CLINIC_VIEW' | 'CLINIC_UPDATE' | 'CLINIC_BAN' | 'CLINIC_UNBAN' | 'CLINIC_DELETE'
  | 'DOCTOR_VIEW' | 'DOCTOR_CREATE' | 'DOCTOR_UPDATE' | 'DOCTOR_DELETE'
  | 'ADMIN_VIEW' | 'ADMIN_CREATE' | 'ADMIN_UPDATE' | 'ADMIN_DISABLE'
  | 'SUPPORT_VIEW' | 'SUPPORT_CREATE' | 'SUPPORT_UPDATE' | 'SUPPORT_DISABLE'
  | 'FAQ_VIEW' | 'FAQ_CREATE' | 'FAQ_UPDATE' | 'FAQ_DELETE'
  | 'AUDIT_LOG_VIEW' | 'DASHBOARD_VIEW';

// ── Response envelopes ────────────────────────────────────────────────────
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message?: string;
}
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface PaginatedEnvelope<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}
export interface ErrorEnvelope {
  success: false;
  error: ApiErrorBody;
}
export type ApiEnvelope<T> = SuccessEnvelope<T> | PaginatedEnvelope<T> | ErrorEnvelope;

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
/** `data.admin` returned by POST /admin/login. */
export interface LoginAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: AdminStatus;
  lastLoginAt?: string;
}
/** Full `data` payload of POST /admin/login (tokens are top-level). */
export interface LoginData extends AuthTokens {
  admin: LoginAdmin;
  permissions: Permission[];
}
/** `data` payload of GET /admin/me — the authenticated actor. */
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: Permission[];
}

// ── Entities ────────────────────────────────────────────────────────────
/** Last known device location, present only when the user granted permission. */
export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  gender?: Gender;
  dob?: string;
  height?: number;
  weight?: number;
  authProvider: AuthProvider;
  onboardingStatus: OnboardingStatus;
  notificationPermission: PermissionStatus;
  locationPermission: PermissionStatus;
  location?: UserLocation | null;
  status: UserStatus;
  lastLoginAt?: string;
  bannedAt?: string | null;
  banReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Postal address on a clinic — every part optional (partial info allowed). */
export interface ClinicAddress {
  line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formatted?: string;
}

/** GPS coordinates captured from the clinic app's "Use current location". */
export interface ClinicLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt?: string;
}

export interface Clinic {
  _id: string;
  name: string;
  phone1: string;
  phone2?: string;
  email?: string;
  yearsOld?: number;
  banner?: string;
  logo?: string;
  description?: string;
  specification?: string;
  specialties?: string[];
  address?: ClinicAddress;
  location?: ClinicLocation | null;
  status: ClinicStatus;
  consultationFee?: number;
  averageConsultationTime?: number;
  doctorsCount?: number;
  bannedAt?: string | null;
  banReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  _id: string;
  clinicId: string;
  name: string;
  qualification?: string;
  specialization?: string;
  age?: number;
  gender?: Gender;
  email?: string;
  phone?: string;
  status: DoctorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: AdminStatus;
  permissions: Permission[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketResponse {
  authorId: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: string;
}
export interface SupportTicket {
  _id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  raisedByType: RaisedByType;
  raisedById: string;
  raisedByName?: string;
  assignedTo?: string | null;
  responses: TicketResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: string | null;
  actorRole: Role;
  actorName: string;
  actorEmail?: string;
  action: string;
  targetType: TargetType;
  targetId?: string | null;
  targetName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  users: { total: number; active: number; banned: number };
  clinics: { total: number; active: number; closed: number; bookingFull: number; banned: number };
  doctors: { total: number };
  newUsers: number;
  newClinics: number;
  recentAuditLogs: AuditLog[];
  recentAdminActivity: AuditLog[];
}
