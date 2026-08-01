/** Bridge that hands the widget its snapshot.
 *
 * The payload is written into the shared App Group (`group.pro.navai.mizan`)
 * that `plugins/withMizanWidgets.js` provisions. The native module only exists
 * in a prebuilt binary, so every call degrades to a no-op in Expo Go and in
 * tests rather than throwing.
 */

import { NativeModules, Platform } from 'react-native';

import type { PrayerName } from '../types/api';
import { PRAYER_LABEL } from '../types/api';

export interface WidgetSnapshot {
  nextPrayerName: string;
  /** ISO-8601 — decoded with `.iso8601` on the Swift side. */
  nextPrayerAt: string;
  tasksDone: number;
  tasksTotal: number;
  prayersKept: number;
  streak: number;
}

interface MizanWidgetsModule {
  setSnapshot(json: string): void;
  reloadTimelines(): void;
}

function nativeModule(): MizanWidgetsModule | null {
  if (Platform.OS !== 'ios') return null;
  const module = (NativeModules as Record<string, unknown>).MizanWidgets;
  return (module as MizanWidgetsModule | undefined) ?? null;
}

export function isWidgetBridgeAvailable(): boolean {
  return nativeModule() !== null;
}

export function buildSnapshot(input: {
  nextPrayer: { name: PrayerName; time: Date };
  tasksDone: number;
  tasksTotal: number;
  prayersKept: number;
  streak: number;
}): WidgetSnapshot {
  return {
    nextPrayerName: PRAYER_LABEL[input.nextPrayer.name],
    nextPrayerAt: input.nextPrayer.time.toISOString(),
    tasksDone: input.tasksDone,
    tasksTotal: input.tasksTotal,
    prayersKept: input.prayersKept,
    streak: input.streak,
  };
}

/** Publishes the snapshot and asks WidgetKit to redraw. No-ops without the module. */
export function publishSnapshot(snapshot: WidgetSnapshot): void {
  const module = nativeModule();
  if (!module) return;
  module.setSnapshot(JSON.stringify(snapshot));
  module.reloadTimelines();
}
