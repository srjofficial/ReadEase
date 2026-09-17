import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IKnowledgeChunkMetadata {
  pageNumber?: number;
  tokenCount?: number;
  sectionTitle?: string;
}

export interface IKnowledgeChunk extends Document {
  documentId: Types.ObjectId;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  metadata?: IKnowledgeChunkMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: [true, 'Knowledge document reference is required']
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0
    },
    content: {
      type: String,
      required: [true, 'Chunk text content is required']
    },
    embedding: {
      type: [Number], // Vector embedding dimensions (e.g. 768 or 1536)
      default: undefined
    },
    metadata: {
      pageNumber: { type: Number },
      tokenCount: { type: Number },
      sectionTitle: { type: String, trim: true }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
knowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

export const KnowledgeChunk: Model<IKnowledgeChunk> = model<IKnowledgeChunk>(
  'KnowledgeChunk',
  knowledgeChunkSchema
);
