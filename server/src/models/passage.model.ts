import { Schema, model, Document, Model } from 'mongoose';

export type PassageLanguage = 'en' | 'ml';
export type PassageDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ISyllableToken {
  word: string;
  syllables: string[];
  phonemes?: string[];
  timingOffsetMs?: number;
}

export interface IPassage extends Document {
  title: string;
  language: PassageLanguage;
  difficultyLevel: PassageDifficulty;
  gradeLevel: string;
  text: string;
  syllableMetadata?: ISyllableToken[];
  tags: string[];
  author?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const passageSchema = new Schema<IPassage>(
  {
    title: {
      type: String,
      required: [true, 'Passage title is required'],
      trim: true
    },
    language: {
      type: String,
      enum: ['en', 'ml'],
      required: [true, 'Language (en/ml) is required'],
      default: 'en'
    },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    gradeLevel: {
      type: String,
      required: [true, 'Target grade level is required'],
      trim: true
    },
    text: {
      type: String,
      required: [true, 'Passage text content is required']
    },
    syllableMetadata: [
      {
        word: { type: String, required: true },
        syllables: [{ type: String }],
        phonemes: [{ type: String }],
        timingOffsetMs: { type: Number }
      }
    ],
    tags: {
      type: [String],
      default: []
    },
    author: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
passageSchema.index({ language: 1, difficultyLevel: 1 });
passageSchema.index({ gradeLevel: 1 });
passageSchema.index({ isActive: 1 });

export const Passage: Model<IPassage> = model<IPassage>('Passage', passageSchema);
