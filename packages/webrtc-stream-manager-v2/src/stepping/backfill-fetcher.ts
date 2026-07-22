// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from '../core/disposable';
import type { MediaFetchSession } from '../core/media-fetch-session';
import { avcCToCodecString, parseCodecFromMime } from './codec-string';
import {
  Fmp4Parser,
  type Fmp4InitSegment,
  type Fmp4ParserEvent,
  type Fmp4VideoFragment,
} from './fmp4-parser';
import { SampleStore, type AnchorPair } from './sample-store';
import type { Logger } from '../types';

// ─── Config ─────────────────────────────────────────────────────────────────

/** A recorded-archive span the client knows about (`endMs` = Infinity while still recording). */
export interface RecordedSpan {
  startMs: number;
  endMs: number;
}

export interface BackfillFetcherConfig {
  /**
   * Open a fetch session positioned at `positionMs` (injected for testability).
   * `speed` overrides the factory's session speed; undefined = factory default.
   */
  openSession: (positionMs: number, speed?: number) => MediaFetchSession;
  /** Window length fetched per request (default 10 s). */
  windowMs?: number;
  /** Overlap with existing coverage when extending back (default 1 s). */
  overlapMs?: number;
  /**
   * Landing slack: the server positions at the governing keyframe ≤ ask, so
   * the first delivery legitimately starts up to one GOP early. Beyond this,
   * the window mis-landed (default 20 s).
   */
  landingSlackMs?: number;
  /** Re-seek delay after a landing miss (default 1.2 s). */
  reseekDelayMs?: number;
  /** No-delivery watchdog while collecting (default 10 s). */
  stallTimeoutMs?: number;
  /** Encoded-store byte cap passthrough. */
  storeByteCap?: number;
  logger?: Logger;
}

// ─── Events & state ─────────────────────────────────────────────────────────

export type BackfillFetcherState =
  | 'idle'
  | 'opening'
  | 'collecting'
  | 'paused'
  | 'failed';

interface BackfillFetcherEventMap {
  /** Init segment parsed — `store`, `init`, and `mime` are available. */
  ready: undefined;
  /** Samples entered the store. */
  progress: { addedSamples: number };
  /** The requested window is fully covered; delivery paused. */
  windowcomplete: undefined;
  /** Nothing delivered for stallTimeoutMs while collecting. */
  stalled: undefined;
  /** Window landed outside tolerance twice — abandoned. */
  landingfailed: undefined;
  /**
   * The re-seek landed at the same forward position twice — the server cannot
   * position earlier than the data it already delivers (archive edge). An
   * honest boundary, not a spray.
   */
  noearlierdata: undefined;
  /**
   * Stitch conflicts persisted across a fresh-anchor re-seek — aim abandoned,
   * existing coverage stays authoritative. The data exists (it conflicted, it
   * is not absent), so this must never be read as a no-earlier-data boundary.
   */
  conflictfailed: undefined;
  /** Parser envelope violation or unrecoverable stitch conflict — disable the feature. */
  unsupported: string;
  /** The fetch session died post-connect. The owner decides on a reopen. */
  sessionlost: undefined;
}

type BackfillFetcherEvent = keyof BackfillFetcherEventMap;

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_MS = 10_000;
const DEFAULT_OVERLAP_MS = 1_000;
const DEFAULT_LANDING_SLACK_MS = 20_000;
const DEFAULT_RESEEK_DELAY_MS = 1_200;
const DEFAULT_STALL_TIMEOUT_MS = 10_000;
/** A hole probe asks for one GOP; silence beyond ~2 s already means the gap is empty. */
const HOLE_PROBE_STALL_TIMEOUT_MS = 2_000;
/** Two landings this close are the server's deterministic answer, not a spray. */
const SAME_LANDING_TOLERANCE_MS = 2_500;
/** Edge jitter absorbed when matching a landing/ask against the client's recorded spans. */
const RECORDED_SPAN_EDGE_SLACK_MS = 1_000;
/** Hop aims end this far inside the previous chunk's tail so window completion keys on real delivery, not the jittery span edge. */
const HOP_TAIL_INSET_MS = RECORDED_SPAN_EDGE_SLACK_MS;
/** Runaway backstop on fragments awaiting an anchor (the server self-paces). */
const MAX_PENDING_FRAGMENTS = 600;
/**
 * Per-aim stitch-conflict tolerance: an isolated anchor-wobble overlap drops
 * just the conflicting fragment, but an aim that keeps conflicting can never
 * progress by dropping more (same bytes re-anchored a hair off keep colliding).
 * At the cap the aim re-seeks for a fresh anchor.
 */
const MAX_AIM_CONFLICTS = 3;
/**
 * Anchors within this of the previous aim's archive↔container mapping are
 * indistinguishable from that aim's in-flight residue: the mapping is constant
 * per delivery window (±quantization, ±~a frame of live wobble) while a real
 * re-position shifts it by at least the seek distance.
 */
const STALE_ANCHOR_TOLERANCE_MS = 100;
/**
 * In-flight residue is only plausible out of an actively-delivering aim (a DC
 * message already sent when the re-aim landed arrives within ~RTT). After a
 * quiet gap the next anchor is the new aim's own and binds immediately.
 */
const RESIDUE_ACTIVITY_WINDOW_MS = 500;
/**
 * A suspect first anchor is parked, not dropped: if nothing supersedes it
 * within this, the aim landed where the old one stood and the anchor was its
 * own — bind late rather than starve the aim. Sized past the ~1 s periodic
 * re-emission so an honest same-place landing confirms sooner.
 */
const SUSPECT_ANCHOR_HOLD_MS = 1_500;
/**
 * Per-session anchor ledger cap — a memory backstop (realistic depth is a
 * handful; the server keeps ~1 anchor outstanding). The lowest surviving entry
 * is always retained as the attribution floor.
 */
const ANCHOR_LEDGER_CAP = 64;

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && a.every((v, i) => v === b[i]);
}

// ─── BackfillFetcher ────────────────────────────────────────────────────────

/**
 * Owns one companion fetch session and pipes it through the parser into an
 * anchored {@link SampleStore}. The server self-paces, so the fetcher only
 * aims windows, verifies landings, and pauses delivery at window end.
 *
 * Anchor generations: the server re-anchors after every seek, and a fragment
 * must only ever bind to the anchor of its own delivery window. Every seek
 * bumps a generation counter; fragments and anchors are tagged on arrival and
 * only matching pairs insert. A fragment whose anchor never arrives is dropped
 * with its generation, never re-bound.
 *
 * No reconnect machinery: a lost session emits `sessionlost`, drops back to
 * `idle`, and stays down until the owner aims again (building a fresh session).
 */
export class BackfillFetcher extends Disposable {
  private readonly config: Required<Pick<BackfillFetcherConfig,
    'windowMs' | 'overlapMs' | 'landingSlackMs' | 'reseekDelayMs' | 'stallTimeoutMs'>>
    & BackfillFetcherConfig;
  private readonly emitter = new EventTarget();

  private session: MediaFetchSession | null = null;
  private sessionCleanups: (() => void)[] = [];
  private parser = new Fmp4Parser();
  private _store: SampleStore | null = null;
  private _init: Fmp4InitSegment | null = null;
  private _state: BackfillFetcherState = 'idle';
  /** Store config epoch for the init segment currently in effect. */
  private currentEpoch = -1;

  // ── Anchor generations ────────────────────────────────────────────────
  private generation = 0;
  private anchor: { gen: number; pair: AnchorPair } | null = null;
  private pendingFragments: { gen: number; fragment: Fmp4VideoFragment; epoch: number }[] = [];
  /**
   * Per-session anchor ledger: every confirmed anchor on the one monotonic
   * container timeline, sorted by rtpTimestamp. The muxer never re-bases within
   * a session, so anchors are mapping-change points: a fragment binds to the
   * latest entry at-or-below its decode origin, placing residue under the
   * mapping that governed its media regardless of fragment shape. Cleared only
   * on a fresh session (the container timeline re-bases there).
   */
  private anchorLedger: { pair: AnchorPair; offsetTicks: number | null; gen: number }[] = [];
  /** The previous aim's mapping offset (ticks) — in-flight residue detector. */
  private staleAnchorOffset: number | null = null;
  /** The current aim's confirmed mapping offset (ticks); null until its first anchor. */
  private aimAnchorOffset: number | null = null;
  /** Anchors seen since the current aim began. */
  private aimAnchorCount = 0;
  /** Wall-clock of the session's most recent delivery activity. */
  private lastActivityAtMs: number | null = null;
  /** First post-aim anchor parked as possible in-flight residue. */
  private suspectAnchor: AnchorPair | null = null;
  private suspectAnchorTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private _preAimDrops = 0;
  private _preAimRebinds = 0;

  // ── Window accounting ─────────────────────────────────────────────────
  private window: { fromMs: number; toMs: number } | null = null;
  private landingChecked = false;
  private reseekAttempted = false;
  /** Between scheduling a re-seek and the new aim's first delivery. */
  private reseekPending = false;
  private reseekTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  /** One-GOP-only delivery mode (seek-while-paused hole refetch). */
  private holeRefetch = false;
  /** Gap-probe aim (refetchHole): uses the short stall watchdog. */
  private probeAim = false;
  /** Where the aim's first delivery mis-landed (deterministic-landing detection). */
  private firstMislandMs: number | null = null;
  /** Highest archive tick this aim's accepted delivery has reached. */
  private deliveredThroughTicks = -Infinity;

  // ── Integrity / diagnostics ───────────────────────────────────────────
  private lastSeq: number | null = null;
  private _seqGaps = 0;
  /** Fragments dropped on a stitch fingerprint conflict (diagnostic). */
  private _stitchConflicts = 0;
  /** Conflicting fragments dropped within the current aim (capped). */
  private aimConflicts = 0;
  /** One bounded fresh-anchor re-seek per request when the cap trips. */
  private conflictReseekAttempted = false;
  /** One `conflictfailed` per request — late in-flight buffers must not re-emit. */
  private conflictAbandoned = false;

  private stallTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

  /** Requested session speed; undefined = the openSession factory's default. */
  private _fetchSpeed: number | undefined;
  /** Speed the LIVE session was opened with — reuse requires it to match {@link _fetchSpeed}. */
  private sessionSpeed: number | undefined;

  /** Recorded-archive spans from the client's chunk data; null = unknown. */
  private recordedSpans: RecordedSpan[] | null = null;
  /** Generations whose landing was verified — only their in-flight residue may re-bind. */
  private landedGens = new Set<number>();

  constructor(config: BackfillFetcherConfig) {
    super();
    this.config = {
      windowMs: DEFAULT_WINDOW_MS,
      overlapMs: DEFAULT_OVERLAP_MS,
      landingSlackMs: DEFAULT_LANDING_SLACK_MS,
      reseekDelayMs: DEFAULT_RESEEK_DELAY_MS,
      stallTimeoutMs: DEFAULT_STALL_TIMEOUT_MS,
      ...config,
    };
    this.onDispose(() => this.teardownSession());
  }

  // ── Public getters ────────────────────────────────────────────────────

  get state(): BackfillFetcherState {
    return this._state;
  }

  get windowMs(): number {
    return this.config.windowMs;
  }

  /**
   * Resize the per-aim window at runtime; the next aim reads it live. Continuous
   * reverse widens it to amortize per-aim re-seek overhead; the caller restores
   * the stepping default on stop.
   */
  setWindowMs(ms: number): void {
    this.config.windowMs = ms;
  }

  /** Fetch-session speed requested of the next session open (undefined = factory default). */
  get fetchSpeed(): number | undefined {
    return this._fetchSpeed;
  }

  /**
   * Set the speed for fetch sessions. Speed is baked into a session at
   * handshake, so a live session opened at a DIFFERENT speed stops being
   * reused — the next aim reconnects instead of DC-seeking it. Continuous
   * reverse raises this (supply must outrun the drain rate); the caller
   * restores the stepping default on stop.
   */
  setFetchSpeed(speed: number | undefined): void {
    this._fetchSpeed = speed;
  }

  /**
   * Supply the recorded-archive spans the client knows for this camera (from
   * the timeline's recordedTimePeriods). Landing verification uses them to
   * tell a legitimate cross-gap island (the previous chunk's tail across a
   * real recording gap) from server mis-positioning inside continuous archive.
   * Null = unknown → landing verdicts fall back to trusting the server.
   */
  setRecordedSpans(spans: RecordedSpan[] | null): void {
    this.recordedSpans = spans;
  }

  /** Available after `ready`. */
  get store(): SampleStore | null {
    return this._store;
  }

  get init(): Fmp4InitSegment | null {
    return this._init;
  }

  get mime(): string | undefined {
    return this.session?.mime;
  }

  /**
   * An in-flight gap-probe aim (refetchHole) still collecting. The owner uses
   * this to settle a probe it has resolved/abandoned — an unsettled probe
   * re-arms its watchdog at probe cadence forever.
   */
  get probing(): boolean {
    return this.probeAim && this._state === 'collecting';
  }

  /**
   * The position (epoch ms) the in-flight aim is collecting toward, or null
   * when nothing is in flight. Lets an owner about to aim at the same target
   * wait for the live aim instead of superseding it — a re-aim's generation
   * bump drops the delivery already under way, and a paused re-seek to the
   * position the session already holds may draw no fresh delivery at all.
   */
  get currentAskMs(): number | null {
    if (this._state !== 'opening' && this._state !== 'collecting') {
      return null;
    }
    return this.window?.toMs ?? null;
  }

  /** mfhd discontinuities observed within delivery runs (diagnostic). */
  get seqGaps(): number {
    return this._seqGaps;
  }

  /** Fragments dropped on a stitch fingerprint conflict (diagnostic). */
  get stitchConflicts(): number {
    return this._stitchConflicts;
  }

  /** In-flight fragments older than the previous aim's mapping, dropped (diagnostic). */
  get preAimDrops(): number {
    return this._preAimDrops;
  }

  /** Previous-aim in-flight fragments re-bound to their own mapping (diagnostic). */
  get preAimRebinds(): number {
    return this._preAimRebinds;
  }

  // ── Events ────────────────────────────────────────────────────────────

  on(event: 'ready', listener: () => void): () => void;
  on(event: 'progress', listener: (detail: { addedSamples: number }) => void): () => void;
  on(event: 'windowcomplete', listener: () => void): () => void;
  on(event: 'stalled', listener: () => void): () => void;
  on(event: 'landingfailed', listener: () => void): () => void;
  on(event: 'noearlierdata', listener: () => void): () => void;
  on(event: 'conflictfailed', listener: () => void): () => void;
  on(event: 'unsupported', listener: (reason: string) => void): () => void;
  on(event: 'sessionlost', listener: () => void): () => void;
  on(event: BackfillFetcherEvent, listener: (...args: never[]) => void): () => void {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail !== undefined) {
        (listener as (d: unknown) => void)(detail);
      } else {
        (listener as () => void)();
      }
    };
    this.emitter.addEventListener(event, handler);
    return () => this.emitter.removeEventListener(event, handler);
  }

  // ── Public control ────────────────────────────────────────────────────

  /**
   * Fetch the window ending at `toMs`. Reuses the existing session via a
   * DC seek when one is alive; otherwise opens a fresh one. Resolves when
   * delivery is underway (not when the window completes — listen for
   * `windowcomplete`).
   */
  async openWindow(toMs: number): Promise<void> {
    this.throwIfDisposed();
    if (this._state === 'failed') {
      throw new Error('BackfillFetcher failed — create a new one');
    }
    const fromMs = toMs - this.config.windowMs;
    this.window = { fromMs, toMs };
    this.beginRequest(false);

    if (this.session && this.session.state === 'connected' && this.sessionSpeed === this._fetchSpeed) {
      // A seek can truncate the previous aim's delivery mid-box; the new
      // aim's first box must parse from a clean slate.
      this.parser.reset();
      this.session.seek(fromMs);
      this.session.resume();
      this.setState('collecting');
      this.armStallTimer();
      return;
    }

    await this.connectSessionAt(fromMs);
  }

  /**
   * Entry fetch for stepping: position AT the anchor and collect just its
   * governing GOP (one-GOP-only), instead of filling a full forward window up
   * to it. The first stepped frame is then ~one GOP away rather than a whole
   * window; the stepper builds the backward runway via {@link extendBack} once
   * stepping is underway. Reuses a live session via a paused DC seek; otherwise
   * opens a fresh one positioned at the anchor.
   */
  async openAtAnchor(anchorMs: number): Promise<void> {
    this.throwIfDisposed();
    if (this._state === 'failed') {
      throw new Error('BackfillFetcher failed — create a new one');
    }
    this.window = { fromMs: anchorMs - this.config.windowMs, toMs: anchorMs };
    this.beginRequest(true);

    if (this.session && this.session.state === 'connected' && this.sessionSpeed === this._fetchSpeed) {
      // Warm: a paused seek delivers exactly the governing GOP, no forward fill.
      if (this._state === 'collecting') {
        this.session.pause();
      }
      this.parser.reset();
      this.session.seek(anchorMs);
      this.setState('collecting');
      this.armStallTimer();
      return;
    }

    // Cold: connect positioned at the anchor. The server delivers forward
    // from the governing keyframe; holeRefetch window-accounting pauses the
    // session the instant a sample covers the ask, so only that GOP lands.
    await this.connectSessionAt(anchorMs);
  }

  /**
   * Extend coverage backward, overlapping existing coverage so the windows
   * stitch. Defaults to the oldest covered position; a caller working a
   * specific coverage island (the cursor's, when older detached islands
   * exist) passes that island's floor instead.
   *
   * When the default window's ask would fall inside a known recording gap and
   * miss the previous chunk entirely, the aim hops to that chunk's tail
   * instead — asking in the gap only draws a forward landing at the current
   * chunk's start (zero backward growth, misread as archive start).
   */
  async extendBack(floorMs?: number): Promise<void> {
    this.throwIfDisposed();
    const store = this._store;
    const coverage = store?.coverage() ?? [];
    if (!store || coverage.length === 0) {
      throw new Error('extendBack before any coverage');
    }
    const oldestMs = floorMs ?? store.ticksToEpochMs(coverage[0].startTicks);
    let toMs = oldestMs + this.config.overlapMs;
    const fromMs = toMs - this.config.windowMs;
    if (this.askIsRecorded(fromMs) === false) {
      const prevEnd = this.prevRecordedEndBefore(fromMs);
      if (prevEnd !== null) {
        toMs = prevEnd - HOP_TAIL_INSET_MS;
      }
    }
    await this.openWindow(toMs);
  }

  /**
   * Targeted hole re-fetch: seek-while-paused delivers exactly the governing
   * GOP plus a fresh anchor, without resuming.
   */
  refetchHole(atMs: number): boolean {
    this.throwIfDisposed();
    if (!this.session || this.session.state !== 'connected') {
      return false;
    }
    if (this._state === 'collecting') {
      this.session.pause();
    }
    this.window = {
      fromMs: atMs - this.config.windowMs,
      toMs: atMs,
    };
    this.beginRequest(true, true);
    this.parser.reset();
    this.session.seek(atMs);
    this.setState('collecting');
    this.armStallTimer();
    return true;
  }

  /** Halt delivery without tearing the session down. */
  pauseDelivery(): void {
    this.session?.pause();
    this.clearStallTimer();
    this.clearReseekTimer();
    if (this._state === 'collecting' || this._state === 'opening') {
      this.setState('paused');
    }
  }

  // ── Private: session lifecycle ────────────────────────────────────────

  private async connectSessionAt(positionMs: number): Promise<void> {
    this.teardownSession();
    this.parser = new Fmp4Parser();
    // A fresh session re-bases the container timeline (tfdt zero-based per
    // session): the old aim's mapping offset is incomparable and the ledger's
    // rtps are meaningless against the new axis; a fresh data channel cannot
    // carry in-flight residue either.
    this.staleAnchorOffset = null;
    this.lastActivityAtMs = null;
    this.anchorLedger = [];
    this.landedGens.clear();
    this.setState('opening');

    const session = this.config.openSession(positionMs, this._fetchSpeed);
    this.sessionSpeed = this._fetchSpeed;
    this.session = session;
    this.sessionCleanups.push(
      session.on('timestamp', (d) => {
        if (typeof d.timestampMs === 'number') {
          this.onAnchor({ timestampMs: d.timestampMs, rtpTimestamp: d.rtpTimestamp });
        }
      }),
      session.on('buffer', (data) => this.onBuffer(data)),
      session.on('error', () => this.onSessionLost()),
    );

    try {
      await session.connect();
    } catch (err) {
      if (this.disposed || this.session !== session) {
        // Superseded mid-connect: a newer aim owns the fetcher, so this
        // rejection belongs to the torn-down session alone — failing here
        // would destroy the replacement.
        if (!session.disposed) {
          session.dispose();
        }
        return;
      }
      this.config.logger?.warn?.('[BackfillFetcher] session connect failed', err);
      this.teardownSession();
      this.setState('idle');
      this.emit('sessionlost', undefined);
      return;
    }
    if (this.disposed || this.session !== session) {
      if (!session.disposed) {
        session.dispose();
      }
      return;
    }
    if (this._state !== 'opening') {
      // Superseded while connecting (owner paused/exited): a pause verb sent
      // before the DC opened was a no-op, so dropping the session is the only
      // reliable way to honor the exit.
      this.teardownSession();
      return;
    }

    this.setState('collecting');
    this.armStallTimer();
  }

  private teardownSession(): void {
    for (const cleanup of this.sessionCleanups) cleanup();
    this.sessionCleanups = [];
    if (this.session && !this.session.disposed) {
      this.session.dispose();
    }
    this.session = null;
    this.clearStallTimer();
    this.clearReseekTimer();
    this.clearSuspectAnchor();
  }

  private onSessionLost(): void {
    if (this.disposed) return;
    this.teardownSession();
    // Recoverable: the owner's next aim builds a fresh session. `failed` stays
    // reserved for unsupported streams.
    this.setState('idle');
    this.emit('sessionlost', undefined);
  }

  // ── Private: delivery pipeline ────────────────────────────────────────

  /** Reset per-request bookkeeping; every aim (open/seek) is a new generation. */
  private beginRequest(holeRefetch: boolean, probeAim = false): void {
    this.generation++;
    this.pendingFragments = [];
    this.landingChecked = false;
    this.reseekAttempted = false;
    this.reseekPending = false;
    this.clearReseekTimer();
    this.holeRefetch = holeRefetch;
    this.probeAim = probeAim;
    this.firstMislandMs = null;
    this.deliveredThroughTicks = -Infinity;
    this.lastSeq = null;
    this.aimConflicts = 0;
    this.conflictReseekAttempted = false;
    this.conflictAbandoned = false;
    this.beginAnchorBarrier();
  }

  /**
   * Arm the stale-anchor barrier for a new aim: remember the outgoing aim's
   * mapping offset so an in-flight anchor of that aim — stamped with the NEW
   * generation on arrival, and which would mis-place every fragment it binds —
   * can be told apart from the new aim's own first anchor.
   */
  private beginAnchorBarrier(): void {
    // Residue is only in flight out of an actively-delivering aim (≈RTT); after
    // a quiet gap the next anchor is the new aim's own and the barrier stands down.
    const residuePlausible = this.lastActivityAtMs !== null
      && Date.now() - this.lastActivityAtMs <= RESIDUE_ACTIVITY_WINDOW_MS;
    this.staleAnchorOffset = residuePlausible && this.anchor && this._store
      ? this.anchorOffsetTicks(this.anchor.pair)
      : null;
    this.anchor = null;
    this.aimAnchorOffset = null;
    this.aimAnchorCount = 0;
    this.clearSuspectAnchor();
  }

  /** Archive↔container mapping offset (ticks) — constant within one aim. */
  private anchorOffsetTicks(pair: AnchorPair): number {
    return this._store!.epochMsToTicks(pair.timestampMs) - pair.rtpTimestamp;
  }

  private onAnchor(pair: AnchorPair): void {
    this.lastActivityAtMs = Date.now();
    // Before the first init there is no tick rate to compare mappings with, and
    // no previous aim on this container timeline. Mid-aim anchors after the
    // first are always accepted: the mapping legitimately moves when delivery
    // crosses a recording gap (the server re-anchors over skipped terrain).
    if (this._store) {
      this.aimAnchorCount++;
      if (this.aimAnchorOffset === null) {
        const offset = this.anchorOffsetTicks(pair);
        // The previous aim's mapping arriving first after a seek may be residue
        // already in flight (binding the new aim's fragments to it mis-places
        // them by the seek distance) — but it may equally be the aim's own
        // anchor for a landing where the old aim stood. Near-live delivery is
        // too sparse to count on a confirming re-emission, so park it: a
        // different mapping supersedes it, silence binds it late.
        if (
          this.staleAnchorOffset !== null
          && Math.abs(offset - this.staleAnchorOffset)
            <= this._store.epochMsToTicks(STALE_ANCHOR_TOLERANCE_MS)
          && this.aimAnchorCount === 1
        ) {
          this.holdSuspectAnchor(pair);
          return;
        }
        this.aimAnchorOffset = offset;
      }
    }
    // A superseded suspect is still truth about the mapping at its tick — keep
    // it in the ledger (tagged as a prior aim) so residue between it and this
    // echo binds under it, never as this aim's own. As an already-seen earlier
    // anchor it back-fills below the echo without tripping the monotonicity guard.
    const supersededSuspect = this.suspectAnchor;
    this.clearSuspectAnchor();
    this.anchor = { gen: this.generation, pair };
    if (supersededSuspect) {
      this.recordLedgerAnchor(supersededSuspect, false, Math.max(0, this.generation - 1));
    }
    if (!this.recordLedgerAnchor(pair)) return;
    this.drainPending();
  }

  /**
   * Park a first anchor indistinguishable from the previous aim's in-flight
   * residue. Any later anchor supersedes it (a re-position arrives with a
   * different mapping; an honest same-place landing re-confirms it ~1 s in); if
   * nothing arrives, it was the only truth — bind it late rather than starve.
   */
  private holdSuspectAnchor(pair: AnchorPair): void {
    this.config.logger?.warn?.(
      '[BackfillFetcher] holding a first anchor matching the previous aim\'s mapping',
    );
    this.clearSuspectAnchor();
    this.suspectAnchor = pair;
    const gen = this.generation;
    this.suspectAnchorTimer = this.setTimeout(() => {
      this.suspectAnchorTimer = null;
      const held = this.suspectAnchor;
      this.suspectAnchor = null;
      if (this.disposed || this.generation !== gen || !held) return;
      this.config.logger?.info?.(
        '[BackfillFetcher] binding the held anchor — nothing superseded it',
      );
      this.aimAnchorOffset = this.anchorOffsetTicks(held);
      this.anchor = { gen, pair: held };
      if (!this.recordLedgerAnchor(held)) return;
      this.drainPending();
    }, SUSPECT_ANCHOR_HOLD_MS);
  }

  private clearSuspectAnchor(): void {
    if (this.suspectAnchorTimer !== null) {
      clearTimeout(this.suspectAnchorTimer);
      this.suspectAnchorTimer = null;
    }
    this.suspectAnchor = null;
  }

  // ── Anchor ledger ─────────────────────────────────────────────────────

  /**
   * Record an anchor in the per-session ledger, sorted by rtp. Offsets are
   * hydrated lazily once the store (and its timescale) exists — the true seek
   * echo can precede the init on a cold entry.
   *
   * `fresh` anchors (a live arrival) enforce monotonicity: the container
   * timeline never re-bases within a session, so an rtp below the ledger
   * high-water mark is a rebase we cannot map — fail honest. Late inserts of an
   * already-seen anchor (a superseded suspect) pass `fresh=false`: they are a
   * sorted back-fill, not a new arrival.
   *
   * Returns false iff a rebase was detected (the fetcher has failed).
   */
  private recordLedgerAnchor(
    pair: AnchorPair,
    fresh = true,
    gen = this.generation,
  ): boolean {
    const offsetTicks = this._store ? this.anchorOffsetTicks(pair) : null;
    if (fresh && this.anchorLedger.length) {
      // rtp-sorted, so the last entry is the high-water mark.
      const max = this.anchorLedger[this.anchorLedger.length - 1].pair.rtpTimestamp;
      const eps = this._store ? this._store.epochMsToTicks(1) : 0;
      if (pair.rtpTimestamp < max - eps) {
        this.fail('container timeline rebase');
        return false;
      }
    }
    let i = this.anchorLedger.length;
    while (i > 0 && this.anchorLedger[i - 1].pair.rtpTimestamp > pair.rtpTimestamp) {
      i--;
    }
    this.anchorLedger.splice(i, 0, { pair, offsetTicks, gen });
    this.evictLedger();
    return true;
  }

  /**
   * Bound the ledger to {@link ANCHOR_LEDGER_CAP} entries, evicting from the
   * low-rtp end. Never evicts an entry a pending fragment could still bind to,
   * and always keeps at least one entry as the attribution floor.
   */
  private evictLedger(): void {
    if (this.anchorLedger.length <= ANCHOR_LEDGER_CAP) return;
    let minPending = Number.POSITIVE_INFINITY;
    for (const p of this.pendingFragments) {
      if (p.fragment.baseDts < minPending) {
        minPending = p.fragment.baseDts;
      }
    }
    while (
      this.anchorLedger.length > ANCHOR_LEDGER_CAP
      && this.anchorLedger.length > 1
      && this.anchorLedger[0].pair.rtpTimestamp < minPending
    ) {
      this.anchorLedger.shift();
    }
  }

  /** The latest ledger anchor governing a fragment whose decode origin is `baseDts`. */
  private governingLedgerAnchor(
    baseDts: number,
  ): { pair: AnchorPair; offsetTicks: number | null; gen: number } | null {
    const eps = this._store ? this._store.epochMsToTicks(1) : 0;
    for (let i = this.anchorLedger.length - 1; i >= 0; i--) {
      if (this.anchorLedger[i].pair.rtpTimestamp <= baseDts + eps) {
        return this.anchorLedger[i];
      }
    }
    return null;
  }

  /** Fill offsets for anchors recorded before the store existed. */
  private hydrateLedgerOffsets(): void {
    if (!this._store) return;
    for (const entry of this.anchorLedger) {
      if (entry.offsetTicks === null) {
        entry.offsetTicks = this.anchorOffsetTicks(entry.pair);
      }
    }
  }

  private onBuffer(data: ArrayBuffer): void {
    this.armStallTimer(); // any delivery counts as liveness
    this.lastActivityAtMs = Date.now();
    let events: Fmp4ParserEvent[];
    try {
      events = this.parser.push(data);
    } catch (err) {
      // The parser's field reads are not bounds-checked end-to-end; an
      // exception escaping here would vanish inside EventTarget dispatch and
      // leave the parser silently corrupted.
      this.config.logger?.error?.('[BackfillFetcher] parser exception', err);
      this.fail('parser exception');
      return;
    }
    for (const event of events) {
      if (event.kind === 'init') {
        this.onInit(event.init);
      } else if (event.kind === 'fragment') {
        // Tag with the epoch at parse time, not insert time: a delayed
        // anchor must not let a later codec change re-tag queued fragments.
        this.pendingFragments.push({
          gen: this.generation,
          fragment: event.fragment,
          epoch: this.currentEpoch,
        });
        // The server self-paces, so the queue only grows while an anchor is
        // outstanding (~1 s). The cap is a runaway backstop — overflow disables
        // the feature rather than silently dropping.
        if (this.pendingFragments.length > MAX_PENDING_FRAGMENTS) {
          this.fail('ingest queue overflow');
          return;
        }
        this.drainPending();
      } else {
        this.fail(event.reason);
        return;
      }
    }
  }

  private onInit(init: Fmp4InitSegment): void {
    const video = init.videoTrack;
    if (init.encrypted || !video || !video.decoderConfig) {
      this.fail(init.encrypted ? 'encrypted stream' : 'no video track');
      return;
    }
    const description = video.decoderConfig;

    if (!this._store) {
      // First init: the MimeInit codec string is authoritative and present
      // before any media, with the avcC derivation as a fallback.
      const codec = parseCodecFromMime(this.mime)
        ?? avcCToCodecString(video.sampleEntry, description);
      if (!codec) {
        this.fail('cannot determine codec string');
        return;
      }
      this._init = init;
      this._store = new SampleStore({
        timescale: video.timescale,
        byteCapBytes: this.config.storeByteCap,
      });
      this.currentEpoch = this._store.registerConfig({ codec, description });
      // On a cold entry the aim's true seek echo can precede this init (echo
      // rtp=0 before any media), with no tick rate yet to derive its mapping.
      // Hydrate its deferred ledger offset and bind it now; otherwise the next
      // periodic anchor masquerades as the echo, the floor lands one GOP high,
      // and the aim's own first GOP is dropped as pre-aim.
      this.hydrateLedgerOffsets();
      if (this.anchor?.gen === this.generation && this.aimAnchorOffset === null) {
        this.aimAnchorCount = 1;
        this.aimAnchorOffset = this.anchorOffsetTicks(this.anchor.pair);
      }
      this.emit('ready', undefined);
      return;
    }

    // A byte-identical re-send (the server replays the init on seek) is not
    // a codec change — keep the current epoch and its codec string.
    if (this._init?.videoTrack?.decoderConfig
      && sameBytes(this._init.videoTrack.decoderConfig, description)) {
      return;
    }

    // Mid-session init = codec boundary (codec/profile/resolution switched
    // mid-recording). Stepping continues across it: the new config becomes a
    // fresh epoch, later fragments are tagged with it, decoder reconfigures per run.
    if (video.timescale !== this._init?.videoTrack?.timescale) {
      // The container timescale is fixed per session — a change would
      // invalidate every anchor mapping.
      this.fail('mid-session timescale change');
      return;
    }
    // The MIME is first-wins/stale here, so the new codec string comes from the
    // avcC; non-AVC families fall back to the stale MIME and degrade honestly.
    const codec = avcCToCodecString(video.sampleEntry, description)
      ?? parseCodecFromMime(this.mime);
    if (!codec) {
      this.fail('cannot determine codec string');
      return;
    }
    this._init = init;
    this.currentEpoch = this._store.registerConfig({ codec, description });
  }

  private drainPending(): void {
    const store = this._store;
    const anchor = this.anchor;
    if (!store || !anchor) return;

    // Between scheduling a bounded re-seek and its firing, the server may
    // keep streaming the abandoned aim — nothing drains (and nothing
    // verdicts) until the re-seek's generation bump clears the queue.
    if (this.reseekPending) return;

    // Drop fragments from superseded generations — binding them to the
    // current anchor would place them at a wrong archive position.
    this.pendingFragments = this.pendingFragments.filter((p) => p.gen === this.generation);
    if (anchor.gen !== this.generation) return;

    while (this.pendingFragments.length) {
      const { fragment, epoch } = this.pendingFragments.shift()!;

      if (this.lastSeq !== null && fragment.seq !== this.lastSeq + 1) {
        this._seqGaps++;
        this.config.logger?.warn?.(
          `[BackfillFetcher] mfhd seq gap: ${this.lastSeq} → ${fragment.seq}`,
        );
      }
      this.lastSeq = fragment.seq;

      // Ledger binding: every confirmed anchor lives on one strictly-monotonic
      // container axis (the muxer never re-bases), so the latest anchor
      // at-or-below a fragment's decode origin is the mapping that governed its
      // media. Residue (below this aim's echo) lands under the previous mapping;
      // the aim's own delivery (at or after its echo) under the current one.
      const governing = this.governingLedgerAnchor(fragment.baseDts);
      if (!governing) {
        // Below the session's first anchor: older than any mapping the ledger
        // can attribute it to (a rapid double re-aim's deep residue) — drop.
        this._preAimDrops++;
        this.config.logger?.warn?.(
          '[BackfillFetcher] dropped an in-flight fragment below the session anchor floor',
        );
        continue;
      }
      if (governing.gen < this.generation) {
        if (!this.landedGens.has(governing.gen)) {
          // Residue of an aim whose landing was never verified (superseded or
          // abandoned at a misland): its mapping may be a mis-positioned
          // delivery, and inserting it would poison the store with phantom
          // coverage far from any ask. Dropping costs at most a refetchable
          // hole; admitting spray teleports the reverse playhead.
          this._preAimDrops++;
          this.config.logger?.warn?.(
            '[BackfillFetcher] dropped in-flight residue of an unverified aim',
          );
          continue;
        }
        // The previous delivery's in-flight media (a flushed partial or
        // grid-cut tail): place it under the mapping that governed it and let
        // the store judge. Never this aim's landing or window accounting, but
        // real coverage that can unblock a waiting step.
        this._preAimRebinds++;
        this.config.logger?.info?.(
          '[BackfillFetcher] bound an in-flight fragment to its governing prior-aim anchor',
        );
        const rebound = store.insertFragment(fragment, governing.pair, epoch);
        if (rebound.accepted && rebound.addedSamples > 0) {
          this.emit('progress', { addedSamples: rebound.addedSamples });
        }
        continue;
      }

      // The aim's own delivery (governing is one of this generation's anchors).
      if (!this.checkLanding(fragment, governing.pair)) return;

      const result = store.insertFragment(fragment, governing.pair, epoch);
      if (result.accepted === true && result.droppedConflicts) {
        // Boundary split: the off-coverage runs inserted, the conflicting
        // overlap was judged away. Real progress, so it never feeds the
        // per-aim escalation cap (diagnostic visibility only).
        this._stitchConflicts++;
        this.config.logger?.warn?.(
          `[BackfillFetcher] coverage-edge overlap judged away ${result.droppedConflicts} samples (seam split)`,
        );
      }
      if (result.accepted === false) {
        if (result.reason === 'fingerprint-conflict' || result.reason === 'interleave-conflict') {
          // Overlapping re-delivery (fingerprint: same bytes re-anchored a hair
          // off so sizes no longer match; interleave: a mis-anchored window
          // landing off-grid inside existing coverage) — drop the conflicting
          // fragment and keep going. Existing coverage stays authoritative and
          // no mislabeled data enters; a resulting gap is just a normal hole
          // the stepper refetches on demand.
          this._stitchConflicts++;
          this.aimConflicts++;
          this.config.logger?.warn?.(
            `[BackfillFetcher] dropped fragment on stitch conflict (${result.reason})`,
          );
          if (this.aimConflicts >= MAX_AIM_CONFLICTS) {
            this.escalateConflictCap();
            return;
          }
          continue;
        }
        continue; // empty fragment — nothing to record
      }
      // Track how far THIS aim's delivery has reached (dupes included): window
      // completion must key on the aim's own delivery, never pre-existing
      // coverage. Keyed on the entry the fragment bound to — a gen can re-anchor
      // mid-window across a skipped recording gap, so each fragment accounts
      // under its own mapping.
      const last = fragment.samples[fragment.samples.length - 1];
      const offsetTicks = governing.offsetTicks ?? this.anchorOffsetTicks(governing.pair);
      this.deliveredThroughTicks = Math.max(
        this.deliveredThroughTicks,
        offsetTicks + last.pts + last.duration,
      );
      if (result.addedSamples > 0) {
        this.emit('progress', { addedSamples: result.addedSamples });
      }
    }

    this.checkWindowComplete();
  }

  /**
   * True when `[fromMs, toMs]` lies inside ONE known recorded span — i.e. the
   * archive is continuous between them and no cross-gap island can exist there.
   * Null = spans unknown, no verdict. Landing verification and the reverse
   * hole-jump pacing both key on this.
   */
  spanIsGapFree(fromMs: number, toMs: number): boolean | null {
    if (!this.recordedSpans) return null;
    for (const s of this.recordedSpans) {
      if (fromMs >= s.startMs - RECORDED_SPAN_EDGE_SLACK_MS
        && toMs <= s.endMs + RECORDED_SPAN_EDGE_SLACK_MS) {
        return true;
      }
    }
    return false;
  }

  /**
   * True when the ask sits STRICTLY inside a known recorded span (edge-inset by
   * the slack — span-edge asks are ambiguous and stay unverdicted). Null =
   * spans unknown.
   */
  private askIsRecorded(askMs: number): boolean | null {
    if (!this.recordedSpans) return null;
    for (const s of this.recordedSpans) {
      if (askMs >= s.startMs + RECORDED_SPAN_EDGE_SLACK_MS
        && askMs <= s.endMs - (Number.isFinite(s.endMs) ? RECORDED_SPAN_EDGE_SLACK_MS : 0)) {
        return true;
      }
    }
    return false;
  }

  /**
   * The end of the latest recorded span that lies wholly below `ms` (with the
   * edge slack), i.e. the previous chunk's tail across a recording gap. Null =
   * spans unknown, or no earlier span. Open-ended spans never qualify — an
   * unfinished recording cannot sit below a gap.
   */
  private prevRecordedEndBefore(ms: number): number | null {
    if (!this.recordedSpans) return null;
    let best: number | null = null;
    for (const s of this.recordedSpans) {
      if (Number.isFinite(s.endMs)
        && s.endMs <= ms - RECORDED_SPAN_EDGE_SLACK_MS
        && (best === null || s.endMs > best)) {
        best = s.endMs;
      }
    }
    return best;
  }

  /**
   * True when any recorded span STARTS below `ms` (with the edge slack) — the
   * archive provably holds earlier data, whether across a gap or lower inside
   * the same span. Null = spans unknown, no verdict. Reverse playback's
   * archive-start conclusion keys on this.
   */
  hasRecordedDataBefore(ms: number): boolean | null {
    if (!this.recordedSpans) return null;
    for (const s of this.recordedSpans) {
      if (s.startMs < ms - RECORDED_SPAN_EDGE_SLACK_MS) {
        return true;
      }
    }
    return false;
  }

  /** Landing verification: first fragment of each aim must be near the ask. */
  private checkLanding(fragment: Fmp4VideoFragment, anchor: AnchorPair): boolean {
    if (this.landingChecked || !this.window) return true;

    const ticksPerMs = this._store!.epochMsToTicks(1);
    const firstMs =
      anchor.timestampMs + (fragment.samples[0].pts - anchor.rtpTimestamp) / ticksPerMs;

    const { fromMs, toMs } = this.window;
    const target = this.holeRefetch ? toMs : fromMs;
    const landed = firstMs >= target - this.config.landingSlackMs && firstMs <= toMs + 1_000;
    if (landed) {
      this.landingChecked = true;
      this.landedGens.add(this.generation);
      return true;
    }

    this.config.logger?.warn?.(
      `[BackfillFetcher] window mis-landed: asked ${target}, got ${Math.round(firstMs)}`,
    );
    if (!this.reseekAttempted) {
      this.firstMislandMs = firstMs;
      this.reseekAttempted = true;
      this.scheduleReseek(target);
      return false;
    }

    // Second verdict: the same landing twice is the server's deterministic
    // answer for this ask, not a spray.
    if (this.firstMislandMs !== null
      && Math.abs(firstMs - this.firstMislandMs) <= SAME_LANDING_TOLERANCE_MS) {
      if (firstMs < target) {
        // Early but stable. Legitimate ONLY when the ask itself falls in a
        // recording gap — the server then positions at the previous chunk's
        // tail (a cross-gap island). When the client's chunk data says the ask
        // is inside recorded archive, the server mis-positioned despite having
        // the data (large jumps teleport reverse through phantom islands) —
        // abandon, never admit it.
        if (this.askIsRecorded(target) === true) {
          this.config.logger?.warn?.(
            '[BackfillFetcher] stable early landing for an ask inside recorded archive — mis-positioning, aim abandoned',
          );
          this.pauseDelivery();
          this.emit('landingfailed', undefined);
          return false;
        }
        // Ask in a gap (or spans unknown): accept the island rather than
        // rejecting the frames the step wants.
        this.config.logger?.info?.(
          '[BackfillFetcher] stable early landing accepted as a coverage island',
        );
        this.landingChecked = true;
        this.landedGens.add(this.generation);
        return true;
      }
      // Forward and stable: the server cannot position earlier here.
      this.config.logger?.warn?.(
        '[BackfillFetcher] server pinned forward of the ask — no earlier data reachable',
      );
      this.pauseDelivery();
      this.emit('noearlierdata', undefined);
      return false;
    }

    // The re-seeked aim missed somewhere else — abandon.
    this.pauseDelivery();
    this.emit('landingfailed', undefined);
    return false;
  }

  /**
   * Halt the mis-delivering stream and re-seek `target` after the bounded
   * delay; the generation bump drops the abandoned aim's queued fragments
   * and the next anchor binds fresh.
   */
  private scheduleReseek(target: number): void {
    this.reseekPending = true;
    this.session?.pause();
    const gen = this.generation;
    this.reseekTimer = this.setTimeout(() => {
      this.reseekTimer = null;
      if (this.disposed || this.generation !== gen) return;
      this.generation++; // new aim — old fragments drop, new anchor binds
      this.pendingFragments = [];
      this.reseekPending = false;
      this.beginAnchorBarrier();
      this.parser.reset();
      this.session?.seek(target);
      if (!this.holeRefetch) {
        this.session?.resume();
      }
    }, this.config.reseekDelayMs);
  }

  /**
   * The aim's delivery keeps conflicting with existing coverage (same bytes
   * re-anchored a hair off). Dropping further fragments can never progress, so
   * re-seek once for a fresh anchor; if conflicts persist, abandon with
   * `conflictfailed`. The data exists — an anchor failure, never a
   * no-earlier-data boundary.
   */
  private escalateConflictCap(): void {
    if (!this.window) return;
    if (this.conflictReseekAttempted) {
      if (this.conflictAbandoned) return;
      this.conflictAbandoned = true;
      this.config.logger?.warn?.(
        '[BackfillFetcher] conflicts persisted across a fresh anchor — abandoning the aim',
      );
      this.pauseDelivery();
      this.emit('conflictfailed', undefined);
      return;
    }
    this.conflictReseekAttempted = true;
    this.aimConflicts = 0;
    // The fresh-anchor delivery is landing-verified like any new aim.
    this.landingChecked = false;
    this.config.logger?.warn?.(
      '[BackfillFetcher] conflict cap hit — re-seeking for a fresh anchor',
    );
    this.scheduleReseek(this.holeRefetch ? this.window.toMs : this.window.fromMs);
  }

  private clearReseekTimer(): void {
    if (this.reseekTimer !== null) {
      clearTimeout(this.reseekTimer);
      this.reseekTimer = null;
    }
    this.reseekPending = false;
  }

  private checkWindowComplete(): void {
    const store = this._store;
    if (!store || !this.window || this._state !== 'collecting') return;

    if (this.holeRefetch) {
      // One governing GOP is the whole ask; any accepted insert completes it.
      if (store.covers(store.epochMsToTicks(this.window.toMs))) {
        this.completeWindow();
      }
      return;
    }

    // Pre-existing coverage containing toMs must never complete the aim:
    // extendBack's toMs lies inside it by construction, and completing on it
    // pauses the session before any backward fill lands. Done means either the
    // whole [fromMs..toMs] is one merged interval (backward fill stitched to
    // existing coverage), or this aim's own delivery passed toMs (server skipped
    // unrecorded terrain inside the window).
    const fromTicks = store.epochMsToTicks(this.window.fromMs);
    const toTicks = store.epochMsToTicks(this.window.toMs);
    const slackTicks = store.epochMsToTicks(1);
    const spansWindow = store.coverage().some(
      (iv) => iv.startTicks <= fromTicks + slackTicks && iv.endTicks >= toTicks - slackTicks,
    );
    if (spansWindow || this.deliveredThroughTicks >= toTicks - slackTicks) {
      this.completeWindow();
    }
  }

  private completeWindow(): void {
    this.session?.pause();
    this.clearStallTimer();
    this.setState('paused');
    this.emit('windowcomplete', undefined);
  }

  // ── Private: watchdog & failure ───────────────────────────────────────

  private armStallTimer(): void {
    this.clearStallTimer();
    if (this.disposed) return;
    const timeoutMs = this.probeAim
      ? Math.min(this.config.stallTimeoutMs, HOLE_PROBE_STALL_TIMEOUT_MS)
      : this.config.stallTimeoutMs;
    this.stallTimer = this.setTimeout(() => {
      this.stallTimer = null;
      if (this._state === 'collecting' || this._state === 'opening') {
        this.emit('stalled', undefined);
        // Keep listening — the server may recover; re-arm so a permanent
        // stall keeps being reported at watchdog cadence.
        this.armStallTimer();
      }
    }, timeoutMs);
  }

  private clearStallTimer(): void {
    if (this.stallTimer !== null) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private fail(reason: string): void {
    this.config.logger?.error?.(`[BackfillFetcher] unsupported: ${reason}`);
    this.pauseDelivery();
    this.setState('failed');
    this.emit('unsupported', reason);
  }

  private setState(state: BackfillFetcherState): void {
    this._state = state;
  }

  private emit<K extends BackfillFetcherEvent>(
    event: K,
    detail: BackfillFetcherEventMap[K],
  ): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
