import { User } from '@models/index';
import type { UpdateUserSettingsInput } from '@utils/validation/users/users.validation';

export async function getUserById(userId: string) {
  const user = await User.findById(userId).select('-passwordHash').lean();
  if (!user) return null;
  return user;
}

export async function updateUserSettings(userId: string, input: UpdateUserSettingsInput) {
  const setFields: Record<string, unknown> = {};

  if (input.summaryLengthPref !== undefined) {
    setFields['settings.summaryLengthPref'] = input.summaryLengthPref;
  }
  if (input.autoStartSession !== undefined) {
    setFields['settings.autoStartSession'] = input.autoStartSession;
  }
  if (input.notificationsEnabled !== undefined) {
    setFields['settings.notificationsEnabled'] = input.notificationsEnabled;
  }
  if (input.watchPlatforms !== undefined) {
    // Deduplicate and lowercase
    setFields['settings.watchPlatforms'] = [...new Set(input.watchPlatforms.map((p) => p.toLowerCase().trim()))];
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: setFields },
    { new: true, runValidators: true }
  ).select('-passwordHash').lean();

  if (!user) return null;
  return user;
}
