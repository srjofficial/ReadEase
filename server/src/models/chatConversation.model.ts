import { Schema, model, Document, Types, Model } from 'mongoose';
import { UserRole } from './user.model';

export type ChatMessageSender = 'user' | 'assistant' | 'system';

export interface IChatCitation {
  docId?: string;
  title?: string;
  chunkId?: string;
  snippet?: string;
}

export interface IChatMessage {
  sender: ChatMessageSender;
  content: string;
  citations?: IChatCitation[];
  timestamp: Date;
}

export interface IChatConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  roleContext: UserRole;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const chatConversationSchema = new Schema<IChatConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    title: {
      type: String,
      required: true,
      default: 'New Conversation'
    },
    roleContext: {
      type: String,
      enum: ['student', 'teacher', 'special_educator', 'parent', 'admin'],
      required: true
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['user', 'assistant', 'system'],
          required: true
        },
        content: {
          type: String,
          required: true
        },
        citations: [
          {
            docId: { type: String },
            title: { type: String },
            chunkId: { type: String },
            snippet: { type: String }
          }
        ],
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes
chatConversationSchema.index({ userId: 1, updatedAt: -1 });

export const ChatConversation: Model<IChatConversation> = model<IChatConversation>(
  'ChatConversation',
  chatConversationSchema
);
