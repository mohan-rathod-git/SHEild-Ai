/**
 * SHEildAI — Offline SOS Queue
 *
 * Uses IndexedDB (via `idb`) to persist SOS events that were triggered
 * while navigator.onLine === false. When the browser's 'online' event
 * fires, the queue is automatically flushed to POST /respond/sos/sync.
 *
 * IndexedDB is used instead of localStorage because:
 *   • It survives app reloads and tab restores
 *   • It supports structured (non-string) data
 *   • It is async and won't block the main thread
 */

import { openDB, type IDBPDatabase } from 'idb';
import { backendApi } from './api';

// ── DB schema ─────────────────────────────────────────────
const DB_NAME = 'sheildai-offline';
const STORE   = 'sos_queue';
const DB_VERSION = 1;

export interface QueuedSOSEvent {
  id: string;               // local UUID
  lat: number;
  lng: number;
  trigger_source: 'manual' | 'voice' | 'motion' | 'mic';
  triggered_at: string;     // ISO timestamp
  queued_at: number;        // Date.now() for sorting
}

// ── Singleton DB connection ───────────────────────────────
let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
  return _db;
}

// ── Public API ────────────────────────────────────────────

/** Queue an SOS event created while offline. */
export async function queueOfflineEvent(
  event: Omit<QueuedSOSEvent, 'id' | 'queued_at'>,
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const record: QueuedSOSEvent = {
    ...event,
    id,
    queued_at: Date.now(),
  };
  await db.put(STORE, record);
  console.info('[OfflineQueue] Queued SOS event', id, 'at', event.triggered_at);
  return id;
}

/** Return all queued events (oldest first). */
export async function getQueuedEvents(): Promise<QueuedSOSEvent[]> {
  const db = await getDB();
  const all = await db.getAll(STORE) as QueuedSOSEvent[];
  return all.sort((a, b) => a.queued_at - b.queued_at);
}

/** Return the count of queued events. */
export async function getQueuedCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}

/** Delete a single queued event after successful sync. */
async function deleteQueuedEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

/**
 * Flush all queued events to the backend via POST /respond/sos/sync.
 * Called automatically when the browser fires the 'online' event.
 * Safe to call multiple times — skips if queue is empty.
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const events = await getQueuedEvents();
  if (events.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.info(`[OfflineQueue] Flushing ${events.length} queued event(s)…`);

  let synced = 0;
  let failed = 0;

  try {
    // Send all events in a single batch request
    await backendApi.syncOfflineEvents(
      events.map(e => ({
        lat: e.lat,
        lng: e.lng,
        trigger_source: e.trigger_source,
        triggered_at: e.triggered_at,
      })),
    );

    // Delete all successfully synced events
    await Promise.all(events.map(e => deleteQueuedEvent(e.id)));
    synced = events.length;
    console.info(`[OfflineQueue] Synced ${synced} event(s)`);
  } catch (err) {
    failed = events.length;
    console.error('[OfflineQueue] Flush failed:', err);
  }

  return { synced, failed };
}

// ── Auto-flush on connectivity restore ────────────────────
let _listenerAttached = false;

export function initOfflineQueueListener(): void {
  if (_listenerAttached) return;
  _listenerAttached = true;

  window.addEventListener('online', async () => {
    console.info('[OfflineQueue] Connectivity restored — flushing queue…');
    const result = await flushOfflineQueue();
    if (result.synced > 0) {
      // Dispatch a custom event so the UI can show a toast
      window.dispatchEvent(
        new CustomEvent('sheildai:offline-synced', {
          detail: { synced: result.synced },
        }),
      );
    }
  });
}
