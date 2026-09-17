import { Schema, model, Document, Types, Model } from 'mongoose';

export type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';

export interface IParentProfile extends Document {
  userId: Types.ObjectId;
  linkedStudentIds: Types.ObjectId[];
  relationship: ParentRelationship;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const parentProfileSchema = new Schema<IParentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    linkedStudentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    relationship: {
      type: String,
      enum: ['mother', 'father', 'guardian', 'other'],
      default: 'guardian'
    },
    contactPhone: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
parentProfileSchema.index({ linkedStudentIds: 1 });

export const ParentProfile: Model<IParentProfile> = model<IParentProfile>(
  'ParentProfile',
  parentProfileSchema
);
