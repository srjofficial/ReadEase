import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IBadge extends Document {
  studentId: Types.ObjectId;
  badgeCode: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  earnedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required']
    },
    badgeCode: {
      type: String,
      required: [true, 'Badge unique code is required'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Badge title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Badge description is required'],
      trim: true
    },
    iconUrl: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      default: 'achievement'
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate badge awards for same student
badgeSchema.index({ studentId: 1, badgeCode: 1 }, { unique: true });
badgeSchema.index({ earnedAt: -1 });

export const Badge: Model<IBadge> = model<IBadge>('Badge', badgeSchema);
