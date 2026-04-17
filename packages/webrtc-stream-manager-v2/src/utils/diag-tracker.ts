// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import type { Logger } from '../types';

/**
 * Diagnostic instrumentation for debugging slow camera loads.
 *
 * Collects per-camera timeline data from connect() through first playing frame.
 * Exposes `window.__webrtcDiag` for console inspection:
 *
 *   __webrtcDiag.summary()          — table of all cameras with phase timings
 *   __webrtcDiag.slow()             — only cameras that took > 5s to first frame
 *   __webrtcDiag.detail(cameraKey)  — full timeline for one camera
 *   __webrtcDiag.reset()            — clear all data
 *   __webrtcDiag.active()           — cameras still waiting for first frame
 *   __webrtcDiag.raw                — raw data map
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiagPhase {
  label: string;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface DiagCameraTimeline {
  connectionKey: string;
  cameraName?: string;
  connectStartMs: number;
  phases: DiagPhase[];

  // Key milestones (absolute performance.now() timestamps)
  ticketFetchStartMs?: number;
  ticketFetchEndMs?: number;
  wsOpenMs?: number;
  sdpOfferMs?: number;
  sdpAnswerMs?: number;
  iceConnectedMs?: number;
  firstTrackMs?: number;
  firstFrameMs?: number; // track unmute — actual video pixels

  // Retry tracking
  baseRetryAttempts: number;
  upgradeRetryAttempts: number;

  // State
  mseFallback: boolean;
  initialStream: string;
  upgradeStream?: string;
  deliveryMethod: string;
  finalState?: string;
  errors: string[];

  // Computed on demand
  disposed: boolean;
}

// ─── Tracker singleton ──────────────────────────────────────────────────────

class DiagTracker {
  private timelines = new Map<string, DiagCameraTimeline>();

  /** Start tracking a new camera connection. */
  startCamera(connectionKey: string, meta?: Partial<DiagCameraTimeline>): DiagCameraTimeline {
    // If re-connecting, preserve old data with a suffix
    const existing = this.timelines.get(connectionKey);
    if (existing && !existing.disposed) {
      existing.disposed = true;
      const suffix = `_prev_${Date.now()}`;
      this.timelines.set(connectionKey + suffix, existing);
    }

    const timeline: DiagCameraTimeline = {
      connectionKey,
      connectStartMs: performance.now(),
      phases: [],
      baseRetryAttempts: 0,
      upgradeRetryAttempts: 0,
      mseFallback: false,
      initialStream: 'unknown',
      deliveryMethod: 'srtp',
      errors: [],
      disposed: false,
      ...meta,
    };
    this.timelines.set(connectionKey, timeline);
    return timeline;
  }

  /** Get the timeline for a camera (or null). */
  get(connectionKey: string): DiagCameraTimeline | null {
    return this.timelines.get(connectionKey) ?? null;
  }

  /** Record a phase start. */
  phaseStart(connectionKey: string, label: string, meta?: Record<string, unknown>): void {
    const t = this.timelines.get(connectionKey);
    if (!t) return;
    t.phases.push({ label, startMs: performance.now(), meta });
  }

  /** Record a phase end (finds the most recent phase with the same label). */
  phaseEnd(connectionKey: string, label: string, meta?: Record<string, unknown>): void {
    const t = this.timelines.get(connectionKey);
    if (!t) return;
    // Find the most recent open phase with this label
    for (let i = t.phases.length - 1; i >= 0; i--) {
      if (t.phases[i].label === label && t.phases[i].endMs === undefined) {
        t.phases[i].endMs = performance.now();
        t.phases[i].durationMs = t.phases[i].endMs! - t.phases[i].startMs;
        if (meta) {
          t.phases[i].meta = { ...t.phases[i].meta, ...meta };
        }
        return;
      }
    }
  }

  /** Record a milestone timestamp. Only records the first value (base connection wins). */
  milestone(connectionKey: string, key: keyof DiagCameraTimeline, meta?: Record<string, unknown>): void {
    const t = this.timelines.get(connectionKey);
    if (!t) return;
    // Don't overwrite — the base connection's milestones are the ones
    // that matter for time-to-first-frame. The upgrade connection would
    // otherwise clobber base values with later timestamps.
    if ((t as unknown as Record<string, unknown>)[key] !== undefined) return;
    (t as unknown as Record<string, unknown>)[key] = performance.now();
    if (meta) {
      // Record as a phase too for the timeline view
      t.phases.push({ label: key, startMs: performance.now(), endMs: performance.now(), durationMs: 0, meta });
    }
  }

  /** Record first frame and log summary via the optional logger. */
  recordFirstFrame(connectionKey: string, logger?: Logger): void {
    const t = this.timelines.get(connectionKey);
    if (!t || t.firstFrameMs) return; // Already recorded

    t.firstFrameMs = performance.now();

    if (!logger?.info) return;

    const totalMs = t.firstFrameMs - t.connectStartMs;

    // Log a consolidated summary for this camera. The %c style hint is a
    // no-op for non-Console loggers and rendered in color by browser DevTools.
    const phases = this.computePhaseSummary(t);
    const style = totalMs > 5000 ? 'color: red; font-weight: bold' : 'color: green';
    logger.info(
      `%c[WEBRTC-DIAG] [${connectionKey}] FIRST FRAME in ${totalMs.toFixed(0)}ms`,
      style,
      phases,
    );
  }

  /** Compute a phase summary object for a timeline. */
  private computePhaseSummary(t: DiagCameraTimeline): Record<string, string> {
    const result: Record<string, string> = {};
    const start = t.connectStartMs;

    if (t.ticketFetchStartMs && t.ticketFetchEndMs) {
      result['ticketFetch'] = `${(t.ticketFetchEndMs - t.ticketFetchStartMs).toFixed(0)}ms`;
    }
    if (t.wsOpenMs) {
      result['wsOpen'] = `+${(t.wsOpenMs - start).toFixed(0)}ms`;
    }
    if (t.sdpOfferMs) {
      result['sdpOffer'] = `+${(t.sdpOfferMs - start).toFixed(0)}ms`;
    }
    if (t.sdpAnswerMs) {
      result['sdpAnswer'] = `+${(t.sdpAnswerMs - start).toFixed(0)}ms`;
    }
    if (t.iceConnectedMs) {
      result['iceConnected'] = `+${(t.iceConnectedMs - start).toFixed(0)}ms`;
    }
    if (t.firstTrackMs) {
      result['firstTrack'] = `+${(t.firstTrackMs - start).toFixed(0)}ms`;
    }
    if (t.firstFrameMs) {
      result['firstFrame'] = `+${(t.firstFrameMs - start).toFixed(0)}ms`;
      result['TOTAL'] = `${(t.firstFrameMs - start).toFixed(0)}ms`;
    }
    result['retries(base/upgrade)'] = `${t.baseRetryAttempts}/${t.upgradeRetryAttempts}`;
    result['delivery'] = t.deliveryMethod;
    result['initialStream'] = t.initialStream;
    if (t.mseFallback) result['mseFallback'] = 'YES';
    if (t.errors.length) result['errors'] = t.errors.join(', ');

    return result;
  }

  // ─── Console API ─────────────────────────────────────────────────────────

  /** Table summary of all cameras. */
  summary(): void {
    const rows: Record<string, unknown>[] = [];
    for (const [key, t] of this.timelines) {
      if (t.disposed) continue;
      const start = t.connectStartMs;
      const now = performance.now();
      rows.push({
        camera: key,
        total: t.firstFrameMs
          ? `${(t.firstFrameMs - start).toFixed(0)}ms`
          : `PENDING (${(now - start).toFixed(0)}ms so far)`,
        ticketFetch: t.ticketFetchStartMs && t.ticketFetchEndMs
          ? `${(t.ticketFetchEndMs - t.ticketFetchStartMs).toFixed(0)}ms`
          : '-',
        wsToIce: t.wsOpenMs && t.iceConnectedMs
          ? `${(t.iceConnectedMs - t.wsOpenMs).toFixed(0)}ms`
          : '-',
        iceToTrack: t.iceConnectedMs && t.firstTrackMs
          ? `${(t.firstTrackMs - t.iceConnectedMs).toFixed(0)}ms`
          : '-',
        trackToFrame: t.firstTrackMs && t.firstFrameMs
          ? `${(t.firstFrameMs - t.firstTrackMs).toFixed(0)}ms`
          : '-',
        retries: `${t.baseRetryAttempts}/${t.upgradeRetryAttempts}`,
        delivery: t.deliveryMethod,
        stream: t.initialStream,
        mse: t.mseFallback ? 'YES' : 'no',
        errors: t.errors.length ? t.errors.join(', ') : '-',
        state: t.finalState ?? (t.firstFrameMs ? 'playing' : 'connecting'),
      });
    }
    console.table(rows);
  }

  /** Show only cameras that took > threshold ms to first frame. */
  slow(thresholdMs = 5000): void {
    const rows: Record<string, unknown>[] = [];
    for (const [key, t] of this.timelines) {
      if (t.disposed) continue;
      const start = t.connectStartMs;
      const now = performance.now();
      const totalMs = t.firstFrameMs
        ? t.firstFrameMs - start
        : now - start;
      if (totalMs > thresholdMs) {
        rows.push({
          camera: key,
          total: t.firstFrameMs ? `${totalMs.toFixed(0)}ms` : `STILL PENDING (${totalMs.toFixed(0)}ms)`,
          phases: this.computePhaseSummary(t),
        });
      }
    }
    if (rows.length === 0) {
      console.log(`[WEBRTC-DIAG] No cameras slower than ${thresholdMs}ms`);
    } else {
      console.table(rows);
    }
  }

  /** Full timeline for one camera. */
  detail(connectionKey: string): void {
    const t = this.timelines.get(connectionKey);
    if (!t) {
      // Try partial match
      for (const [key, val] of this.timelines) {
        if (key.includes(connectionKey)) {
          console.log(`[WEBRTC-DIAG] Detail for ${key}:`);
          console.log(val);
          console.log('Phase summary:', this.computePhaseSummary(val));
          console.log('All phases:', val.phases);
          return;
        }
      }
      console.log(`[WEBRTC-DIAG] No camera found matching "${connectionKey}"`);
      return;
    }
    console.log(`[WEBRTC-DIAG] Detail for ${connectionKey}:`);
    console.log(t);
    console.log('Phase summary:', this.computePhaseSummary(t));
    console.log('All phases:', t.phases);
  }

  /** Cameras still waiting for first frame. */
  active(): void {
    const rows: Record<string, unknown>[] = [];
    for (const [key, t] of this.timelines) {
      if (t.disposed || t.firstFrameMs) continue;
      const elapsed = performance.now() - t.connectStartMs;
      rows.push({
        camera: key,
        elapsed: `${elapsed.toFixed(0)}ms`,
        lastPhase: t.phases.length > 0 ? t.phases[t.phases.length - 1].label : 'none',
        retries: `${t.baseRetryAttempts}/${t.upgradeRetryAttempts}`,
        errors: t.errors.length ? t.errors.join(', ') : '-',
      });
    }
    if (rows.length === 0) {
      console.log('[WEBRTC-DIAG] All cameras have first frame');
    } else {
      console.table(rows);
    }
  }

  /** Clear all tracking data. */
  reset(): void {
    this.timelines.clear();
    console.log('[WEBRTC-DIAG] All tracking data cleared');
  }

  /** Raw data map for programmatic access. */
  get raw(): Map<string, DiagCameraTimeline> {
    return this.timelines;
  }
}

// ─── Global singleton ──────────────────────────────────────────────────────

export const diagTracker = new DiagTracker();

// Expose on window for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__webrtcDiag = {
    summary: () => diagTracker.summary(),
    slow: (ms?: number) => diagTracker.slow(ms),
    detail: (key: string) => diagTracker.detail(key),
    active: () => diagTracker.active(),
    reset: () => diagTracker.reset(),
    get raw() { return diagTracker.raw; },
  };
}
