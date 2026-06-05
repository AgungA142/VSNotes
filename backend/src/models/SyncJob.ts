import { Schema, model, Document, Types } from 'mongoose';

export interface ISyncJob extends Document {
  userId: Types.ObjectId;
  operationType: 'create' | 'update' | 'delete';
  resourceType: 'session' | 'note' | 'audio';
  resourceId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const syncJobSchema = new Schema<ISyncJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    operationType: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['session', 'note', 'audio'],
      required: true,
    },
    resourceId: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

syncJobSchema.index({ userId: 1, status: 1 });
syncJobSchema.index({ userId: 1, createdAt: 1 });

export const SyncJob = model<ISyncJob>('SyncJob', syncJobSchema);
