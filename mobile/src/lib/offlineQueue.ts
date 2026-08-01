/** Offline mutation queue backed by SQLite.
 *
 * Writes made without connectivity are appended here and replayed in insertion
 * order once the app is online again. Only idempotent-safe mutations belong in
 * the queue: task status changes, prayer bulk upserts and transaction creates.
 */

import * as SQLite from 'expo-sqlite';

import { api } from './api';

export type QueuedMethod = 'POST' | 'PATCH' | 'DELETE';

export interface QueuedMutation {
  id: number;
  method: QueuedMethod;
  path: string;
  body: string | null;
  created_at: string;
  attempts: number;
}

const DB_NAME = 'mizan.db';
/** Give up after this many failures so one poisoned row cannot block the queue. */
const MAX_ATTEMPTS = 5;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS mutation_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        body TEXT,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
    `);
    return db;
  })();
  return dbPromise;
}

export async function enqueue(
  method: QueuedMethod,
  path: string,
  body?: unknown,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO mutation_queue (method, path, body, created_at) VALUES (?, ?, ?, ?)',
    method,
    path,
    body === undefined ? null : JSON.stringify(body),
    new Date().toISOString(),
  );
}

export async function pending(): Promise<QueuedMutation[]> {
  const db = await getDb();
  return db.getAllAsync<QueuedMutation>(
    'SELECT * FROM mutation_queue ORDER BY id ASC',
  );
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM mutation_queue',
  );
  return row?.count ?? 0;
}

async function remove(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM mutation_queue WHERE id = ?', id);
}

async function recordFailure(row: QueuedMutation): Promise<void> {
  const db = await getDb();
  if (row.attempts + 1 >= MAX_ATTEMPTS) {
    await remove(row.id);
    return;
  }
  await db.runAsync(
    'UPDATE mutation_queue SET attempts = attempts + 1 WHERE id = ?',
    row.id,
  );
}

export interface FlushResult {
  sent: number;
  failed: number;
}

/**
 * Replays queued mutations oldest-first.
 *
 * A 4xx means the server rejected the payload permanently, so the row is
 * dropped; anything else (offline, 5xx) is retried on the next flush and the
 * loop stops to preserve ordering.
 */
export async function flush(): Promise<FlushResult> {
  const rows = await pending();
  let sent = 0;

  for (const row of rows) {
    try {
      await api.request({
        method: row.method,
        url: row.path,
        data: row.body ? (JSON.parse(row.body) as unknown) : undefined,
      });
      await remove(row.id);
      sent += 1;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status && status >= 400 && status < 500) {
        await remove(row.id);
        continue;
      }
      await recordFailure(row);
      return { sent, failed: rows.length - sent };
    }
  }

  return { sent, failed: 0 };
}

/** Test seam — drops every queued row. */
export async function clearQueue(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM mutation_queue');
}
