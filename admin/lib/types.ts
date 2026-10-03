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
export type TicketCategory = 'PAYMENTS' | 'BOOKINGS' | 'TECHNICAL' | 'OTHER';
export type RaisedByType = 'USER' | 'CLINIC';

export type TargetType = 'USER' | 'CLINIC' | 'DOCTOR' | 'ADMIN' | 'SUPPORT' | 'AUTH' | 'PAYMENT' | 'SETTINGS';

/** Lifecycle of a Razorpay transaction. */
export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';
/** Offline settlement state of a PAID transaction's clinic share. */
export type SettlementStatus = 'PENDING' | 'PAID';
/** Which amount GST is levied on (consultation fee is exempt). */
export type GstBase = 'PLATFORM_REVENUE' | 'PLATFORM_FEE';

export type Permission =
  | 'USER_VIEW' | 'USER_UPDATE' | 'USER_BAN' | 'USER_UNBAN' | 'USER_DELETE'
  | 'CLINIC_VIEW' | 'CLINIC_UPDATE' | 'CLINIC_BAN' | 'CLINIC_UNBAN' | 'CLINIC_DELETE'
  | 'DOCTOR_VIEW' | 'DOCTOR_CREATE' | 'DOCTOR_UPDATE' | 'DOCTOR_DELETE'
  | 'ADMIN_VIEW' | 'ADMIN_CREATE' | 'ADMIN_UPDATE' | 'ADMIN_DISABLE'
  | 'SUPPORT_VIEW' | 'SUPPORT_CREATE' | 'SUPPORT_UPDATE' | 'SUPPORT_DISABLE'
  | 'FAQ_VIEW' | 'FAQ_CREATE' | 'FAQ_UPDATE' | 'FAQ_DELETE'
  | 'SETTINGS_VIEW' | 'SETTINGS_UPDATE' | 'PAYMENT_VIEW' | 'PAYMENT_REFUND' | 'WALLET_SETTLE'
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
  walletBalancePaise?: number;
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

/** Appointment slot rules set by the clinic ("Slot Configuration" screen). */
export interface SlotConfiguration {
  slotDurationMin?: number;
  breakBetweenSlotsMin?: number;
  maxPatientsPerSlot?: number;
  advanceBookingDays?: number;
  sameDayBooking?: boolean;
  bookingEnabled?: boolean;
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
  slotConfiguration?: SlotConfiguration;
  status: ClinicStatus;
  consultationFee?: number;
  /** Days a paid visit's token stays valid for a free re-book (0/absent = off). */
  tokenValidityDays?: number;
  averageConsultationTime?: number;
  doctorsCount?: number;
  /** Platform's commission on the consultation fee (0–100). Null = use platform default. */
  commissionPercent?: number | null;
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
  category?: TicketCategory;
  attachments?: string[];
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

// ── Pricing / payments ────────────────────────────────────────────────────
/** Global pricing settings singleton (GET/PATCH /admin/settings). Money in paise. */
export interface PricingSettings {
  _id: string;
  key: string;
  platformFeePaise: number;
  gstRate: number;
  defaultCommissionPercent: number;
  gstBase: GstBase;
  currency: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Snapshot of how a booking total was built and split (integer paise). */
export interface PaymentBreakdown {
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  commissionPercent: number;
  gstBasePaise: number;
  gstRate: number;
  gstBase: GstBase;
  gstPaise: number;
  totalPaise: number;
  clinicAmountPaise: number;
  platformAmountPaise: number;
}

/**
 * Offline per-clinic settlement state carried on each PAID transaction. The
 * admin clears it manually; `amountPaise` snapshots the clinic's share
 * (= breakdown.clinicAmountPaise) at the time the order was created.
 */
export interface TransactionSettlement {
  status: SettlementStatus;
  amountPaise: number;
  settledAt?: string | null;
  settledBy?: string | null;
  note?: string | null;
}

/** Appointment summary populated onto a transaction for the admin table. */
export interface TransactionAppointment {
  _id: string;
  date?: string;
  slotStart?: string;
  slotEnd?: string;
  status?: string;
  tokenNo?: number | null;
}

/**
 * A patient payment collected through Razorpay into the platform's account
 * (collection `transactions`). The platform holds the funds and settles each clinic's
 * 90% share offline from the Wallet. `clinicName` is snapshotted so the admin table
 * needs no join; `appointmentId` is populated to the summary above when listed.
 */
export interface Transaction {
  _id: string;
  userId: string;
  clinicId: string;
  clinicName?: string;
  appointmentId?: TransactionAppointment | string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayStatus?: string | null;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  breakdown: PaymentBreakdown;
  settlement: TransactionSettlement;
  contact?: { name?: string; phone?: string } | null;
  paidAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-clinic settlement summary (collection `wallets`) — a materialised cache
 * recomputed from that clinic's transactions. All money in integer paise.
 */
export interface WalletClinic {
  _id?: string;
  clinicId: string;
  clinicName?: string;
  totalCollectedPaise: number;
  clinicPayablePaise: number;
  platformSharePaise: number;
  pendingPaise: number;
  settledPaise: number;
  paidCount: number;
  pendingCount: number;
  settledCount: number;
  transactionCount: number;
  lastTransactionAt?: string | null;
  lastSettledAt?: string | null;
  updatedAt?: string;
}

/**
 * Aggregated bill for one clinic: the platform's earning split (fee + commission
 * + GST) and the clinic's 90% payable, summed across the clinic's PAID
 * transactions. `platformEarningPaise === platformSharePaise`.
 */
export interface WalletBill {
  consultationFeePaise: number;
  platformFeePaise: number;
  commissionPaise: number;
  gstPaise: number;
  platformEarningPaise: number;
  clinicPayablePaise: number;
  totalCollectedPaise: number;
  currency: string;
}

/** Response of GET /admin/wallet/:clinicId. */
export interface ClinicWalletDetail {
  wallet: WalletClinic;
  bill: WalletBill;
  transactions: Transaction[];
}
