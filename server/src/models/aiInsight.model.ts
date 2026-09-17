import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IAiInsight extends Document {
  sessionId: Types.ObjectId;
  studentId: Types.ObjectId;
  summary: string;
  observations: string[];
  recommendations: string[];
  screeningScore: number;
  screeningLevel: 'low' | 'medium' | 'high';
  generatedBy: 'ai-service' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const aiInsightSchema = new Schema<IAiInsight>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ReadingSession',
      required: [true, 'Session reference is required'],
      unique: true
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    summary: {
      type: String,
      required: [true, 'Insight summary is required'],
      trim: true
    },
    observations: {
      type: [String],
      default: []
    },
    recommendations: {
      type: [String],
      default: []
    },
    screeningScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    screeningLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    generatedBy: {
      type: String,
      enum: ['ai-service', 'system'],
      default: 'ai-service'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
aiInsightSchema.index({ studentId: 1, createdAt: -1 });

export const AiInsight: Model<IAiInsight> = model<IAiInsight>('AiInsight', aiInsightSchema);
