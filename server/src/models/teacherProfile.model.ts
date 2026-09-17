import { Schema, model, Document, Types, Model } from 'mongoose';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface IVerificationDocument {
  title: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
}

export interface ITeacherProfile extends Document {
  userId: Types.ObjectId;
  school: string;
  qualification: string;
  experienceYears: number;
  verificationDocuments: IVerificationDocument[];
  verificationStatus: VerificationStatus;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  maxStudents: number;
  createdAt: Date;
  updatedAt: Date;
}

const teacherProfileSchema = new Schema<ITeacherProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    school: {
      type: String,
      required: [true, 'School or institution name is required'],
      trim: true
    },
    qualification: {
      type: String,
      required: [true, 'Teaching qualification is required'],
      trim: true
    },
    experienceYears: {
      type: Number,
      required: [true, 'Experience in years is required'],
      min: [0, 'Experience cannot be negative']
    },
    verificationDocuments: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    maxStudents: {
      type: Number,
      default: 20,
      min: [1, 'Must have at least 1 student capacity'],
      max: [20, 'Teacher student capacity cannot exceed 20 active students per system policy']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
teacherProfileSchema.index({ verificationStatus: 1 });
teacherProfileSchema.index({ school: 1 });

export const TeacherProfile: Model<ITeacherProfile> = model<ITeacherProfile>(
  'TeacherProfile',
  teacherProfileSchema
);
