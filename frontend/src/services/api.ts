/**
 * SHEildAI — Backend API Client
 *
 * Typed fetch wrapper for all FastAPI backend calls.
 * SOS trigger/sync MUST go through this (not Supabase directly)
 * because the cascade logic requires the service role key.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────

export type TriggerSource = 'manual' | 'voice' | 'motion' | 'mic';

export interface SOSTriggerResponse {
  event_id: string;
  status: string;
  message: string;
}

export interface OfflineEventPayload {
  lat: number;
  lng: number;
  trigger_source: TriggerSource;
  triggered_at: string;
}

export interface SOSStatusResponse {
  event: {
    id: string;
    user_id: string;
    lat: number;
    lng: number;
    triggered_at: string;
    status: 'triggered' | 'acknowledged' | 'resolved';
    trigger_source: TriggerSource;
    synced_offline: boolean;
  };
  recipients: Array<{
    id: string;
    sos_event_id: string;
    recipient_user_id: string;
    role: 'contact' | 'volunteer' | 'police';
    notified_at: string;
    acknowledged_at: string | null;
  }>;
}

// ── HTTP helper ───────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`API ${resp.status}: ${body}`);
  }

  return resp.json() as Promise<T>;
}

// ── API methods ───────────────────────────────────────────

export const backendApi = {
  /**
   * Trigger an SOS cascade via the backend.
   * MUST be called instead of writing to Supabase directly —
   * the backend uses the service role key to fan out notifications.
   */
  async triggerSOS(
    payload: { lat: number; lng: number; trigger_source: TriggerSource },
    token: string,
  ): Promise<SOSTriggerResponse> {
    return apiFetch<SOSTriggerResponse>(
      '/api/v1/respond/sos/trigger',
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    );
  },

  /**
   * Batch-sync offline-queued SOS events once connectivity returns.
   */
  async syncOfflineEvents(
    events: OfflineEventPayload[],
    token?: string,
  ): Promise<{ synced_count: number; events: Array<{ id: string; status: string }> }> {
    return apiFetch(
      '/api/v1/respond/sos/sync',
      { method: 'POST', body: JSON.stringify({ events }) },
      token,
    );
  },

  /**
   * Poll current SOS event status (fallback when Realtime isn't available).
   */
  async getSOSStatus(eventId: string, token: string): Promise<SOSStatusResponse> {
    return apiFetch<SOSStatusResponse>(
      `/api/v1/respond/sos/${eventId}/status`,
      { method: 'GET' },
      token,
    );
  },

  /**
   * Resolve / cancel an active SOS event.
   */
  async resolveSOSEvent(eventId: string, token: string): Promise<void> {
    await apiFetch(
      `/api/v1/respond/sos/${eventId}/resolve`,
      { method: 'POST' },
      token,
    );
  },

  /** Health check */
  async health(): Promise<{ status: string }> {
    return apiFetch('/health');
  },
};
