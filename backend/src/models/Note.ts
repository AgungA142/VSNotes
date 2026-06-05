import { Schema, model, Document, Types } from 'mongoose';

export interface INote extends Document {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  timestampSec: number;
  text: string;
  type: 'auto' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    timestampSec: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['auto', 'manual'],
      required: true,
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for frequently queried combinations
noteSchema.index({ sessionId: 1, timestampSec: 1 });
noteSchema.index({ userId: 1, sessionId: 1 });

export const Note = model<INote>('Note', noteSchema);
