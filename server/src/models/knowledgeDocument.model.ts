import { Schema, model, Document, Types, Model } from 'mongoose';

export type IngestionStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface IKnowledgeDocument extends Document {
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  status: IngestionStatus;
  chunkCount: number;
  uploadedBy: Types.ObjectId;
  documentUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'txt', 'docx', 'md']
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1
    },
    category: {
      type: String,
      required: true,
      default: 'general'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'indexed', 'failed'],
      default: 'pending'
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    documentUrl: {
      type: String,
      trim: true
    },
    errorMessage: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
knowledgeDocumentSchema.index({ status: 1 });
knowledgeDocumentSchema.index({ category: 1, status: 1 });
knowledgeDocumentSchema.index({ uploadedBy: 1 });

export const KnowledgeDocument: Model<IKnowledgeDocument> = model<IKnowledgeDocument>(
  'KnowledgeDocument',
  knowledgeDocumentSchema
);
