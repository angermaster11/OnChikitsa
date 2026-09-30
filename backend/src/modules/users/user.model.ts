import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import {
  GENDER,
  USER_STATUS,
  AUTH_PROVIDER,
  ONBOARDING_STATUS,
  PERMISSION_STATUS,
  type Gender,
  type UserStatus,
  type AuthProvider,
  type OnboardingStatus,
  type PermissionStatus,
} from '../../utils/constants';

/** Last known device location, captured only when the user grants permission. */
export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt?: Date;
}

/**
 * App end-user (patient). Authenticated exclusively via Firebase phone OTP; we
 * never store a password. `firebaseUid` is the trusted identity link and is
 * unique. Soft-deletion via `status=DELETED` + `deletedAt`.
 *
 * `gender`/`dob` are optional because the account is created right after phone
 * verification (name + phone), then enriched during the onboarding funnel.
 * `onboardingStatus` + the two `*Permission` mirrors let the app resume the
 * funnel deterministically and let the admin panel see the real device state.
 */
export interface UserDoc extends Document<Types.ObjectId> {
  firebaseUid: string;
  name: string;
  email?: string;
  phone: string;
  gender?: Gender;
  dob?: Date;
  height?: number;
  weight?: number;
  authProvider: AuthProvider;
  onboardingStatus: OnboardingStatus;
  notificationPermission: PermissionStatus;
  locationPermission: PermissionStatus;
  location?: UserLocation | null;
  /** Clinics this patient has favourited (toggled from the app). */
  favoriteClinics: Types.ObjectId[];
  status: UserStatus;
  lastLoginAt?: Date;
  bannedAt?: Date | null;
  bannedBy?: Types.ObjectId | null;
  banReason?: string | null;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    firebaseUid: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, enum: Object.values(GENDER) },
    dob: { type: Date },
    height: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },
    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDER),
      default: AUTH_PROVIDER.PHONE,
      required: true,
    },
    onboardingStatus: {
      type: String,
      enum: Object.values(ONBOARDING_STATUS),
      default: ONBOARDING_STATUS.PENDING,
      required: true,
    },
    notificationPermission: {
      type: String,
      enum: Object.values(PERMISSION_STATUS),
      default: PERMISSION_STATUS.PROMPT,
      required: true,
    },
    locationPermission: {
      type: String,
      enum: Object.values(PERMISSION_STATUS),
      default: PERMISSION_STATUS.PROMPT,
      required: true,
    },
    location: {
      type: new Schema<UserLocation>(
        {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
          accuracy: { type: Number },
          updatedAt: { type: Date },
        },
        { _id: false },
      ),
      default: null,
    },
    favoriteClinics: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Clinic' }],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      required: true,
    },
    lastLoginAt: { type: Date },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    banReason: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// firebaseUid uniqueness declared field-level. Secondary indexes for the common
// admin-panel filters (search/status/date) below.
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
// Text index to back name search.
userSchema.index({ name: 'text' });

export const User: Model<UserDoc> = model<UserDoc>('User', userSchema);
