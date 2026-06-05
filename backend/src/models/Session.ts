import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  videoTitle: string;
  sourceApp: string;
  sourceType: 'local' | 'streaming';
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  status: 'active' | 'completed' | 'dismissed';
  deviceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoTitle: {
      type: String,
      required: true,
      trim: true,
    },
    sourceApp: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['local', 'streaming'],
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    durationSec: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dismissed'],
      required: true,
      default: 'active',
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for frequently queried combinations
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ userId: 1, createdAt: -1 });

// Partial unique index: hanya 1 sesi aktif per user (enforced di database level).
// Tidak mempengaruhi sesi completed/dismissed — hanya berlaku saat status='active'.
sessionSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_session_per_user' }
);

export const Session = model<ISession>('Session', sessionSchema);
