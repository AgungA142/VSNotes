import { Schema, model, Document, Types } from 'mongoose';

export interface ITranscriptionJob extends Document {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  audioData: string; // base64 WAV
  timestampSec: number;
  durationSec: number;
  capturedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transcriptionJobSchema = new Schema<ITranscriptionJob>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audioData: { type: String, required: true },
    timestampSec: { type: Number, required: true, min: 0 },
    durationSec: { type: Number, required: true, min: 0 },
    capturedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    error: { type: String },
  },
  { timestamps: true }
);

export const TranscriptionJob = model<ITranscriptionJob>('TranscriptionJob', transcriptionJobSchema);
