import { Schema, model, Document, Model } from 'mongoose';

export type OtpPurpose = 'signup' | 'forgot_password';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  purpose: OtpPurpose;
  userData?: Record<string, unknown>;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required']
    },
    purpose: {
      type: String,
      enum: ['signup', 'forgot_password'],
      required: true
    },
    userData: {
      type: Schema.Types.Mixed
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index auto-deletes expired OTP documents
    }
  },
  {
    timestamps: true
  }
);

// Compound index for quick lookup by email and purpose
otpSchema.index({ email: 1, purpose: 1 });

export const Otp: Model<IOtp> = model<IOtp>('Otp', otpSchema);
