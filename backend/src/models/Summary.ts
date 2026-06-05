import { Schema, model, Document, Types } from 'mongoose';

export interface ISummary extends Document {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  keyPoints: string[];
  lengthPref: 'short' | 'medium' | 'long';
  createdAt: Date;
}

const summarySchema = new Schema<ISummary>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    keyPoints: {
      type: [String],
      required: true,
      default: [],
    },
    lengthPref: {
      type: String,
      enum: ['short', 'medium', 'long'],
      required: true,
      default: 'medium',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for querying summaries by user
summarySchema.index({ userId: 1, sessionId: 1 });

export const Summary = model<ISummary>('Summary', summarySchema);
