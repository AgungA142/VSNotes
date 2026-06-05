import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  settings: {
    summaryLengthPref: 'short' | 'medium' | 'long';
    autoStartSession: boolean;
    notificationsEnabled: boolean;
    watchPlatforms: string[];
  };
  passwordResetToken: string | null;
  passwordResetExpiry: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    settings: {
      summaryLengthPref: {
        type: String,
        enum: ['short', 'medium', 'long'],
        default: 'medium',
      },
      autoStartSession: {
        type: Boolean,
        default: true,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      watchPlatforms: {
        type: [String],
        default: [
          'youtube', 'netflix', 'vimeo', 'twitch', 'prime video',
          'disney+', 'disney plus', 'hbo', 'hulu', 'peacock', 'apple tv',
          'udemy', 'coursera', 'edx', 'skillshare', 'linkedin learning',
          'pluralsight', 'udacity', 'khan academy',
        ],
      },
    },
    passwordResetToken: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
