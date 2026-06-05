import { Schema, model, Document, Types } from 'mongoose';

export interface ITranscriptSegment extends Document {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  timestampSec: number;
  text: string;
  language: string;
  createdAt: Date;
}

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
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
      trim: true,
      minlength: [1, 'Teks transkrip tidak boleh kosong'],
    },
    language: {
      type: String,
      required: true,
      default: 'id',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for querying segments by session and timestamp
transcriptSegmentSchema.index({ sessionId: 1, timestampSec: 1 });
transcriptSegmentSchema.index({ userId: 1, sessionId: 1 });

export const TranscriptSegment = model<ITranscriptSegment>(
  'TranscriptSegment',
  transcriptSegmentSchema
);
