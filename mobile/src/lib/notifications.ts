/** Local notifications: prayer reminders, daily task nudge, weekly muhosaba. */

import * as Notifications from 'expo-notifications';

import type { PrayerTimeEntry } from './prayerTimes';
import { PRAYER_LABEL } from '../types/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return result.granted;
}

/**
 * Reschedules every local notification from scratch.
 *
 * Cancelling first keeps the schedule idempotent — calling this on every app
 * start or settings change can never pile up duplicates.
 */
export async function rescheduleAll(options: {
  prayers?: PrayerTimeEntry[];
  dailyTaskReminder?: boolean;
  weeklyMuhosaba?: boolean;
}): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const entry of options.prayers ?? []) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${PRAYER_LABEL[entry.name]} vaqti`,
        body: 'Namoz vaqti kirdi.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: entry.time.getHours(),
        minute: entry.time.getMinutes(),
      },
    });
  }

  if (options.dailyTaskReminder) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bugungi vazifalar',
        body: 'Bugungi rejangizni ko‘rib chiqing.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });
  }

  if (options.weeklyMuhosaba) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Haftalik muhosaba',
        body: 'Haftangizni sarhisob qiling.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // expo-notifications weekday: 1 = Sunday, so 1 is Sunday evening.
        weekday: 1,
        hour: 20,
        minute: 0,
      },
    });
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
