import { Schema, model, Document, Types, Model } from 'mongoose';

export type SpecialEducatorStatus = 'active' | 'invited' | 'inactive';

export interface ISpecialEducatorProfile extends Document {
  userId: Types.ObjectId;
  qualification: string;
  specialization: string;
  invitedBy?: Types.ObjectId;
  assignedStudentIds: Types.ObjectId[];
  status: SpecialEducatorStatus;
  createdAt: Date;
  updatedAt: Date;
}

const specialEducatorProfileSchema = new Schema<ISpecialEducatorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    qualification: {
      type: String,
      required: [true, 'Special educator qualification is required'],
      trim: true
    },
    specialization: {
      type: String,
      required: [true, 'Specialization area is required (e.g. Dyslexia, Phonological Processing)'],
      trim: true
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedStudentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['active', 'invited', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
specialEducatorProfileSchema.index({ assignedStudentIds: 1 });
specialEducatorProfileSchema.index({ invitedBy: 1 });
specialEducatorProfileSchema.index({ status: 1 });

export const SpecialEducatorProfile: Model<ISpecialEducatorProfile> =
  model<ISpecialEducatorProfile>('SpecialEducatorProfile', specialEducatorProfileSchema);
