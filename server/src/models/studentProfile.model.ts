import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IStudentPreferences {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  fontFamily: string;
  theme: string;
  bionicReadingEnabled: boolean;
  bionicFixationPoint: number;
  readingRulerEnabled: boolean;
  readingRulerHeight: number;
  ttsRate: number;
  ttsPitch: number;
  ttsVoice: string;
  syllableBreakdown: boolean;
}

export interface IStudentProfile extends Document {
  userId: Types.ObjectId;
  teacherId?: Types.ObjectId;
  parentIds: Types.ObjectId[];
  specialEducatorIds: Types.ObjectId[];
  grade: string;
  preferredLanguage: 'en' | 'ml';
  readingLevel: string;
  preferences: IStudentPreferences;
  totalSessionsCompleted: number;
  totalReadingTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const defaultPreferences: IStudentPreferences = {
  fontSize: 18,
  lineHeight: 1.75,
  letterSpacing: 0.03,
  wordSpacing: 0.05,
  fontFamily: 'Lexend',
  theme: 'cream',
  bionicReadingEnabled: false,
  bionicFixationPoint: 50,
  readingRulerEnabled: false,
  readingRulerHeight: 36,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoice: 'default',
  syllableBreakdown: false
};

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    parentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    specialEducatorIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    grade: {
      type: String,
      required: [true, 'Student grade/standard is required'],
      trim: true
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'ml'],
      default: 'en'
    },
    readingLevel: {
      type: String,
      default: 'beginner'
    },
    preferences: {
      fontSize: { type: Number, default: defaultPreferences.fontSize },
      lineHeight: { type: Number, default: defaultPreferences.lineHeight },
      letterSpacing: { type: Number, default: defaultPreferences.letterSpacing },
      wordSpacing: { type: Number, default: defaultPreferences.wordSpacing },
      fontFamily: { type: String, default: defaultPreferences.fontFamily },
      theme: { type: String, default: defaultPreferences.theme },
      bionicReadingEnabled: { type: Boolean, default: defaultPreferences.bionicReadingEnabled },
      bionicFixationPoint: { type: Number, default: defaultPreferences.bionicFixationPoint },
      readingRulerEnabled: { type: Boolean, default: defaultPreferences.readingRulerEnabled },
      readingRulerHeight: { type: Number, default: defaultPreferences.readingRulerHeight },
      ttsRate: { type: Number, default: defaultPreferences.ttsRate },
      ttsPitch: { type: Number, default: defaultPreferences.ttsPitch },
      ttsVoice: { type: String, default: defaultPreferences.ttsVoice },
      syllableBreakdown: { type: Boolean, default: defaultPreferences.syllableBreakdown }
    },
    totalSessionsCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReadingTimeMinutes: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
studentProfileSchema.index({ teacherId: 1 });
studentProfileSchema.index({ parentIds: 1 });
studentProfileSchema.index({ specialEducatorIds: 1 });
studentProfileSchema.index({ preferredLanguage: 1 });

export const StudentProfile: Model<IStudentProfile> = model<IStudentProfile>(
  'StudentProfile',
  studentProfileSchema
);
