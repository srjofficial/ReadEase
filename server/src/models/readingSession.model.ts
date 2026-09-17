import { Schema, model, Document, Types, Model } from 'mongoose';

export type SessionLanguage = 'en' | 'ml';
export type SessionType = 'practice' | 'assessment';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface IReadingSession extends Document {
  studentId: Types.ObjectId;
  teacherId?: Types.ObjectId;
  passageId?: Types.ObjectId;
  language: SessionLanguage;
  sessionType: SessionType;
  durationSeconds: number;
  wordsRead: number;
  readingSpeedWpm: number;
  fixationDurationMs: number;
  fixationCount: number;
  regressionCount: number;
  skippedWordsCount: number;
  accuracyPercentage: number;
  riskLevel: RiskLevel;
  disclaimer: string;
  rawGazeDataSummary?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const readingSessionSchema = new Schema<IReadingSession>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID reference is required']
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    passageId: {
      type: Schema.Types.ObjectId,
      ref: 'Passage'
    },
    language: {
      type: String,
      enum: ['en', 'ml'],
      required: [true, 'Session language (en/ml) is required'],
      default: 'en'
    },
    sessionType: {
      type: String,
      enum: ['practice', 'assessment'],
      default: 'practice'
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: [0, 'Duration cannot be negative']
    },
    wordsRead: {
      type: Number,
      default: 0,
      min: 0
    },
    readingSpeedWpm: {
      type: Number,
      default: 0,
      min: 0
    },
    fixationDurationMs: {
      type: Number,
      default: 0,
      min: 0
    },
    fixationCount: {
      type: Number,
      default: 0,
      min: 0
    },
    regressionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    skippedWordsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    accuracyPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    disclaimer: {
      type: String,
      required: true,
      default: 'Screening aid only, not a clinical diagnosis'
    },
    rawGazeDataSummary: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for dashboards & analytics
readingSessionSchema.index({ studentId: 1, createdAt: -1 });
readingSessionSchema.index({ teacherId: 1, createdAt: -1 });
readingSessionSchema.index({ riskLevel: 1, createdAt: -1 });
readingSessionSchema.index({ sessionType: 1 });

export const ReadingSession: Model<IReadingSession> = model<IReadingSession>(
  'ReadingSession',
  readingSessionSchema
);
