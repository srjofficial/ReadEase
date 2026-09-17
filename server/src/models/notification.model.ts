import { Schema, model, Document, Types, Model } from 'mongoose';

export type NotificationType =
  | 'teacher_verification'
  | 'student_assignment'
  | 'assessment_ready'
  | 'system_alert'
  | 'session_completed';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required']
    },
    type: {
      type: String,
      enum: [
        'teacher_verification',
        'student_assignment',
        'assessment_ready',
        'system_alert',
        'session_completed'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    data: {
      type: Schema.Types.Mixed
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> = model<INotification>(
  'Notification',
  notificationSchema
);
