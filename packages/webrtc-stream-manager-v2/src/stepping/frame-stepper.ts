// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { GopDecoder } from './gop-decoder';
import type { BackfillFetcher } from './backfill-fetcher';
import type { SampleStore, StoreSample } from './sample-store';
import type { Logger } from '../types';

/** Entry-compare tolerance: integration anchor vs fetch placement disagree by anchor quantization. Mirrors the store's EPSILON_MS. */
const ANCHOR_EPSILON_MS = 1;

// ─── Config ─────────────────────────────────────────────────────────────────

export interface FrameStepperConfig {
  fetcher: BackfillFetcher;
  /** Decoder factory. Codec config is not passed here: it rides each decode run, so the decoder reconfigures across a mid-session codec boundary. */
  createDecoder?: (timescale: number) => GopDecoder;
  decoderByteCap?: number;
  logger?: Logger;
}

// ─── Events & state ─────────────────────────────────────────────────────────

export type FrameStepperState = 'idle' | 'stepping' | 'loading' | 'disabled';

interface FrameStepperEventMap {
  /** A stepped-to frame is ready to paint. The stepper's cache owns it. */
  frame: { epochMs: number; frame: VideoFrame };
  loading: boolean;
  /** Cursor returned to the entry anchor going forward — leave stepping. */
  exitforward: undefined;
  /** A prev step found no earlier recorded frame; stepping stays alive within the runway. Handling is optional. */
  noearlierframe: undefined;
  disabled: string;
}

type FrameStepperEvent = keyof FrameStepperEventMap;

// ─── FrameStepper ───────────────────────────────────────────────────────────

/**
 * The stepping state machine: IDLE ↔ STEPPING with a LOADING sub-state and a
 * terminal DISABLED. Owns the {@link GopDecoder}; borrows the fetcher.
 *
 * Cursor positions are archive epoch ticks bound to actual store samples
 * (never fps arithmetic). A target in a different coverage interval is a HOLE:
 * honest loading plus one targeted re-fetch, never a silent skip. Step
 * requests while loading coalesce — latest direction wins, replays on resolve.
 */
export class FrameStepper {
  private readonly config: FrameStepperConfig;
  private readonly fetcher: BackfillFetcher;
  private readonly fetcherCleanups: (() => void)[] = [];
  private readonly emitter = new EventTarget();

  private decoder: GopDecoder | null = null;
  private decoderFailures = 0;

  private _state: FrameStepperState = 'idle';
  /** Entry anchor (ticks) — stepping forward past this exits to the DC path. */
  private entryTicks = 0;
  /** Entry anchor bound to a real store sample (one-shot per entry). */
  private entryBound = false;
  /** Current cursor: the ticks of the displayed stepped frame (or entry). */
  private cursorTicks = 0;
  private pendingStep: 'prev' | 'next' | null = null;
  /** Re-anchor parked while the entry connect is in flight (with any queued click). */
  private pendingAnchor: { anchorMs: number; carried: 'prev' | 'next' | null } | null = null;
  /** Monotonic token: stale async completions must not paint. */
  private stepToken = 0;
  /**
   * The coverage gap currently being probed. `verified` flips on an empty
   * probe — the candidate across the gap is then the true adjacent frame, so
   * stepping to it is honest. `conflictsAtAim` snapshots the fetcher's
   * stitch-conflict count at aim: a probe whose data conflicted away found
   * data, not an empty gap, and must never verify. `reaimed` bounds the
   * fresh-anchor retry.
   */
  private pendingHole: {
    lowTicks: number;
    highTicks: number;
    verified: boolean;
    conflictsAtAim: number;
    reaimed: boolean;
  } | null = null;
  /** Consecutive fetcher stalls while a step waits on the fetch (bounded → abandon). */
  private stallStrikes = 0;
  /** Consecutive stalls on an aim no user wait owns (bounded → settle). */
  private backgroundStalls = 0;
  /** Consecutive abandoned windows while a step was waiting (bounded → boundary). */
  private landingFailures = 0;
  /**
   * Background (proactive) aims that mis-positioned — throttles
   * {@link maybeExtendAhead}. Deliberately survives exit(): re-anchor churn
   * must not re-arm proactive aims against a server that keeps mis-positioning.
   */
  private backgroundMislands = 0;
  /** Consecutive fetch-session losses with no healthy delivery between. */
  private sessionLosses = 0;
  /** Oldest covered tick when the active user-driven extendBack was aimed. */
  private userExtendFloorTicks: number | null = null;
  /** Consecutive user-driven extendBack aims with zero backward growth. */
  private zeroGrowthExtends = 0;
  /** Concluded boundary: a prev step below this floor is an honest no-op. */
  private noOlderDataFloorTicks: number | null = null;

  constructor(config: FrameStepperConfig) {
    this.config = config;
    this.fetcher = config.fetcher;

    this.fetcherCleanups.push(
      // Any new coverage may unblock a pending step.
      this.fetcher.on('progress', () => {
        this.stallStrikes = 0;
        this.backgroundStalls = 0;
        this.landingFailures = 0;
        this.sessionLosses = 0;
        this.backgroundMislands = 0;
        this.maybeBindEntry();
        if (this.pendingHole) {
          // Only coverage landing INSIDE the gap invalidates the probe —
          // an unrelated background fill must not restart it.
          const inside = this.fetcher.store?.nextSample(this.pendingHole.lowTicks);
          if (!inside || inside.ticks >= this.pendingHole.highTicks) {
            return;
          }
          this.pendingHole = null;
        }
        this.retryPending();
      }),
      this.fetcher.on('windowcomplete', () => {
        this.sessionLosses = 0;
        this.noteExtendOutcome();
        this.retryPending();
        // Entry collects only the governing GOP; build the backward runway
        // proactively. Gated on headroom, so a no-op once the runway is deep.
        if (this._state === 'stepping' || this._state === 'loading') {
          this.maybeExtendAhead();
        }
      }),
      this.fetcher.on('stalled', () => this.onStalled()),
      this.fetcher.on('unsupported', (reason) => this.disable(`fetcher: ${reason}`)),
      this.fetcher.on('landingfailed', () => this.onLandingFailed()),
      this.fetcher.on('noearlierdata', () => this.onNoEarlierData('server cannot position earlier')),
      this.fetcher.on('conflictfailed', () => this.onConflictFailed()),
      this.fetcher.on('sessionlost', () => this.onSessionLost()),
    );
  }

  // ── Public getters ────────────────────────────────────────────────────

  get state(): FrameStepperState {
    return this._state;
  }

  /** Resume target for the visible connection. */
  get cursorEpochMs(): number | null {
    const store = this.fetcher.store;
    if (!store || this._state === 'idle') return null;
    return store.ticksToEpochMs(this.cursorTicks);
  }

  // ── Events ────────────────────────────────────────────────────────────

  on(event: 'frame', listener: (detail: { epochMs: number; frame: VideoFrame }) => void): () => void;
  on(event: 'loading', listener: (loading: boolean) => void): () => void;
  on(event: 'exitforward', listener: () => void): () => void;
  on(event: 'noearlierframe', listener: () => void): () => void;
  on(event: 'disabled', listener: (reason: string) => void): () => void;
  on(event: FrameStepperEvent, listener: (...args: never[]) => void): () => void {
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
   * Enter stepping at the paused position. Aims the entry fetch AT the
   * anchor so its governing GOP arrives in ~one GOP rather than a full
   * forward window — the first click paints fast. The backward runway then
   * builds via extendBack as stepping proceeds.
   */
  enterStepping(anchorMs: number): void {
    if (this._state === 'disabled') return;
    this.entryBound = false;
    this.entryTicks = anchorMs; // provisional: ms until the store exists, then ticks
    this.cursorTicks = anchorMs;
    if (this.fetcher.store) {
      this.entryTicks = this.fetcher.store.epochMsToTicks(anchorMs);
      this.cursorTicks = this.entryTicks;
      this.maybeBindEntry();
    } else {
      const unsub = this.fetcher.on('ready', () => {
        unsub();
        const store = this.fetcher.store!;
        this.entryBound = false;
        this.entryTicks = store.epochMsToTicks(anchorMs);
        this.cursorTicks = this.entryTicks;
        this.maybeBindEntry();
      });
      this.fetcherCleanups.push(unsub);
    }
    this.setState('stepping');
    void this.fetcher.openAtAnchor(anchorMs).catch((err) => {
      this.config.logger?.warn?.('[FrameStepper] openAtAnchor failed', err);
    });
  }

  /**
   * Bind the provisional entry conversion to the governing store sample. The
   * anchor ms rides the viewing connection's mapping, which can disagree with
   * the fetch session's placement beyond the dedup epsilon — unbound, the
   * first prev target and the exit compare are a sub-ms coin flip around the
   * displayed frame. Only a decisively-near floor binds: a farther one means
   * the anchor region isn't covered yet, or is a deliberate mid-interval
   * scrub target — never re-bind those.
   */
  private maybeBindEntry(): void {
    if (this.entryBound) {
      return;
    }
    const store = this.fetcher.store;
    if (!store) {
      return;
    }
    const floor = store.floorSample(this.entryTicks);
    if (!floor) {
      return;
    }
    const distTicks = Math.abs(this.entryTicks - floor.ticks);
    if (distTicks + store.epochMsToTicks(ANCHOR_EPSILON_MS) >= floor.durationTicks / 2) {
      return;
    }
    if (this.cursorTicks === this.entryTicks) {
      this.cursorTicks = floor.ticks;
    }
    this.entryTicks = floor.ticks;
    this.entryBound = true;
  }

  /** Step to the actual previous archive frame (exact, or honest loading). */
  stepPrev(): void {
    this.requestStep('prev');
  }

  /** Step forward within the stepped region; past the entry → exitforward. */
  stepNext(): void {
    this.requestStep('next');
  }

  /**
   * Re-aim at a new paused position (scrub-while-paused). A click queued
   * while loading is carried over and replays against the new anchor — a
   * re-anchor must never swallow a step. While the entry connect is still in
   * flight the target is parked, not applied: re-aiming would tear down the
   * connecting session; once ready a warm paused seek re-aims without churn.
   */
  reanchor(anchorMs: number): void {
    if (this._state === 'idle' || this._state === 'disabled') return;
    if (this.fetcher.state === 'opening' && !this.fetcher.store) {
      if (this.pendingAnchor == null) {
        const unsub = this.fetcher.on('ready', () => {
          unsub();
          // Microtask: 'ready' fires mid-parse — re-aiming synchronously would
          // reset the parser inside its own push loop and mis-tag the
          // remaining events with the new generation.
          void Promise.resolve().then(() => this.applyPendingAnchor());
        });
        this.fetcherCleanups.push(unsub);
      }
      this.pendingAnchor = {
        anchorMs,
        carried: this.pendingStep ?? this.pendingAnchor?.carried ?? null,
      };
      // Cleared so the old aim's progress can't replay the click at the
      // stale anchor before the re-aim applies.
      this.pendingStep = null;
      return;
    }
    this.applyReanchor(anchorMs, this.pendingStep);
  }

  private applyPendingAnchor(): void {
    const pending = this.pendingAnchor;
    this.pendingAnchor = null;
    if (!pending || this._state === 'idle' || this._state === 'disabled') return;
    this.applyReanchor(pending.anchorMs, this.pendingStep ?? pending.carried);
  }

  private applyReanchor(anchorMs: number, carried: 'prev' | 'next' | null): void {
    this.exit();
    this.enterStepping(anchorMs);
    if (carried) {
      this.beginLoading(carried);
    }
  }

  /** Leave stepping unconditionally; every exit lands on plain video. */
  exit(): void {
    this.stepToken++;
    this.pendingStep = null;
    this.pendingAnchor = null;
    this.pendingHole = null;
    this.stallStrikes = 0;
    this.backgroundStalls = 0;
    this.landingFailures = 0;
    this.sessionLosses = 0;
    this.zeroGrowthExtends = 0;
    this.userExtendFloorTicks = null;
    this.noOlderDataFloorTicks = null;
    this.lastExtendFloorTicks = null;
    this.decoder?.dispose();
    this.decoder = null;
    this.decoderFailures = 0;
    this.fetcher.pauseDelivery();
    if (this._state !== 'disabled') {
      this.setState('idle');
    }
  }

  /** Full teardown (exit + listener cleanup). */
  dispose(): void {
    this.exit();
    for (const cleanup of this.fetcherCleanups) cleanup();
    this.fetcherCleanups.length = 0;
  }

  // ── Private: step orchestration ───────────────────────────────────────

  private requestStep(direction: 'prev' | 'next'): void {
    if (this._state === 'idle' || this._state === 'disabled') return;
    if (this._state === 'loading') {
      this.pendingStep = direction; // coalesce: latest direction wins
      return;
    }
    void this.performStep(direction);
  }

  private async performStep(direction: 'prev' | 'next'): Promise<void> {
    const store = this.fetcher.store;
    if (!store) {
      this.beginLoading(direction);
      return;
    }

    const target = direction === 'prev'
      ? store.prevSample(this.cursorTicks)
      : store.nextSample(this.cursorTicks);

    if (direction === 'next') {
      // Forward past the entry anchor: the underlying video already shows that
      // frame — hand control back. Epsiloned: an unbound entry can sit within
      // anchor wobble of the entry sample itself.
      if (!target
        || target.ticks > this.entryTicks + store.epochMsToTicks(ANCHOR_EPSILON_MS)) {
        this.emit('exitforward', undefined);
        return;
      }
    }

    if (!target) {
      // Nothing older buffered (direction is 'prev' — next exits above).
      if (this.atNoOlderDataBoundary(store)) {
        this.declineNoEarlierFrame();
        return;
      }
      this.beginLoading(direction);
      const floorTicks = store.coverage()[0]?.startTicks ?? null;
      if (floorTicks !== null && floorTicks > this.cursorTicks) {
        // Cursor below ALL coverage (a re-anchor whose entry GOP hasn't
        // landed yet): extending the floor would march a distant island
        // toward the cursor one window at a time — and supersede the entry
        // aim on every pass. Aim at the cursor itself instead.
        const cursorMs = store.ticksToEpochMs(this.cursorTicks);
        const askMs = this.fetcher.currentAskMs;
        if (askMs !== null && Math.abs(askMs - cursorMs) <= 1) {
          // The entry aim for this exact target is already in flight —
          // superseding it drops its delivery, and a paused re-seek to the
          // position the session already holds may draw nothing fresh. The
          // queued step replays when the aim completes (or stalls out).
          return;
        }
        void this.fetcher.openAtAnchor(cursorMs).catch(() => {
          this.disable('cannot aim fetch window');
        });
        return;
      }
      this.userExtendFloorTicks = floorTicks;
      void this.fetcher.extendBack().catch(() => {
        void this.fetcher.openWindow(store.ticksToEpochMs(this.cursorTicks)).catch(() => {
          this.disable('cannot aim fetch window');
        });
      });
      return;
    }

    if (!store.contiguous(target.ticks, this.cursorTicks)) {
      // A hole separates cursor and candidate — the candidate may not be the
      // true adjacent frame.
      const lowTicks = Math.min(target.ticks, this.cursorTicks);
      const highTicks = Math.max(target.ticks, this.cursorTicks);
      if (
        this.pendingHole?.verified
        && this.pendingHole.lowTicks === lowTicks
        && this.pendingHole.highTicks === highTicks
      ) {
        // Probe came back empty: nothing recorded in the gap, so the candidate
        // IS the adjacent frame — honest, not a skip.
        this.pendingHole = null;
        await this.decodeAndPaint(target, direction);
        return;
      }

      // Honest loading + one targeted re-fetch aimed at the gap's midpoint:
      // its governing GOP reveals any recorded content inside the gap.
      this.pendingHole = {
        lowTicks,
        highTicks,
        verified: false,
        conflictsAtAim: this.fetcher.stitchConflicts,
        reaimed: false,
      };
      this.beginLoading(direction);
      const holeMs = store.ticksToEpochMs((lowTicks + highTicks) / 2);
      if (!this.fetcher.refetchHole(holeMs)) {
        void this.fetcher.openWindow(holeMs).catch(() => {
          this.disable('cannot aim fetch window');
        });
      }
      return;
    }

    await this.decodeAndPaint(target, direction);
  }

  private async decodeAndPaint(target: StoreSample, direction: 'prev' | 'next'): Promise<void> {
    const store = this.fetcher.store!;
    const run = store.gopFor(target.ticks);
    if (!run) {
      // Covered but no governing keyframe — treat like a hole.
      this.beginLoading(direction);
      this.fetcher.refetchHole(store.ticksToEpochMs(target.ticks));
      return;
    }

    const decoder = this.ensureDecoder();
    if (!decoder) return; // disabled inside

    const token = ++this.stepToken;
    const cacheHit = decoder.cachedFrame(target.ticks) !== null;
    if (!cacheHit) this.beginLoading(null);

    let frame: VideoFrame;
    try {
      frame = await decoder.frameAt(run);
    } catch (err) {
      if (token !== this.stepToken) return;
      this.onDecodeFailure(err, target, direction);
      return;
    }
    if (token !== this.stepToken) return; // superseded by exit/another step

    this.decoderFailures = 0;
    this.stallStrikes = 0;
    this.landingFailures = 0;
    this.pendingHole = null;
    this.cursorTicks = target.ticks;
    this.endLoading();
    this.emit('frame', { epochMs: store.ticksToEpochMs(target.ticks), frame });

    this.maybeLookahead(target);
    this.maybeExtendAhead();
    // Frames beyond the entry are unreachable (stepNext exits there).
    decoder.trimAbove(this.entryTicks);
    store.evictToCap(this.cursorTicks);

    const queued = this.pendingStep;
    if (queued) {
      // Replay a click coalesced during this decode now; left queued it would
      // resurrect as a phantom step in a later unrelated loading phase.
      this.pendingStep = null;
      void this.performStep(queued);
    }
  }

  /** Lookahead: entering the lower third of a GOP pre-decodes the previous one. */
  private maybeLookahead(current: StoreSample): void {
    const store = this.fetcher.store!;
    const run = store.gopFor(current.ticks);
    if (!run || !this.decoder) return;

    // gopFor's run ends AT the target, so position within the FULL GOP needs
    // its real extent: walk forward to the next keyframe (or coverage edge).
    const keyTicks = run.samples[0].ticks;
    let end: StoreSample = current;
    for (
      let probe = store.nextSample(end.ticks);
      probe && !probe.key && store.contiguous(end.ticks, probe.ticks);
      probe = store.nextSample(end.ticks)
    ) {
      end = probe;
    }
    const span = end.ticks - keyTicks;
    if (span > 0 && (current.ticks - keyTicks) / span > 1 / 3) return;

    const prevGopTail = store.prevSample(keyTicks);
    if (!prevGopTail || !store.contiguous(prevGopTail.ticks, keyTicks)) return;
    const prevRun = store.gopFor(prevGopTail.ticks);
    if (prevRun) {
      this.decoder.frameAt(prevRun).catch(() => {
        // Opportunistic; a real failure surfaces on the user's actual step.
      });
    }
  }

  /** Oldest covered tick when the last proactive extend was aimed (backoff key). */
  private lastExtendFloorTicks: number | null = null;

  /** Extend-on-demand: ≤2 s of headroom below the cursor → fetch more. */
  private maybeExtendAhead(): void {
    const store = this.fetcher.store!;
    const coverage = store.coverage();
    if (!coverage.length) {
      return;
    }
    // 'opening' too: re-aiming tears down the in-flight connect, and every
    // re-aim's generation bump drops that aim's undelivered fragments.
    if (this.fetcher.state === 'collecting' || this.fetcher.state === 'opening') {
      return;
    }
    // Proactive aims against a mis-positioning server, or below a concluded
    // boundary, only churn — user steps still aim on demand.
    if (this.backgroundMislands >= 2) {
      return;
    }
    if (this.noOlderDataFloorTicks !== null
      && coverage[0].startTicks >= this.noOlderDataFloorTicks) {
      return;
    }
    // No island at or below the cursor (a re-anchor whose entry hasn't
    // landed): there is no runway to maintain — the step path aims at the
    // cursor on demand.
    if (coverage[0].startTicks > this.cursorTicks) {
      return;
    }
    // Headroom within the cursor's own interval: a detached older island
    // must not masquerade as runway.
    let interval = coverage[0];
    for (const iv of coverage) {
      if (iv.startTicks > this.cursorTicks) {
        break;
      }
      interval = iv;
    }
    const headroomMs =
      store.ticksToEpochMs(this.cursorTicks) - store.ticksToEpochMs(interval.startTicks);
    if (headroomMs > 2_000) {
      return;
    }
    // No backward growth since the last proactive extend (archive start or
    // starved aim) — re-aiming would only drop in-flight delivery again.
    if (this.lastExtendFloorTicks !== null && interval.startTicks >= this.lastExtendFloorTicks) {
      return;
    }
    this.lastExtendFloorTicks = interval.startTicks;
    // Grow the cursor's own island: the default (global-oldest) floor belongs
    // to a detached older island whose growth never improves this runway.
    void this.fetcher.extendBack(store.ticksToEpochMs(interval.startTicks)).catch(() => {
      // Out of runway without a session is the next step's honest loading.
    });
  }

  // ── Private: loading & retry ──────────────────────────────────────────

  /**
   * A stall during a hole probe means the server had nothing for the gap —
   * verify it and let the pending step cross honestly. UNLESS conflicts grew
   * during the probe: then the gap's data arrived and was conflicted away, so
   * verifying would silently skip real frames. Other stalls strike only while
   * a step actually waits on the fetch; a bounded count abandons the wait —
   * the machine must never wedge in `loading`, and stepping stays alive.
   */
  private onStalled(): void {
    // Idle/disabled the stepper owns no aim, but it still borrows the fetcher —
    // a concurrent owner (ReversePlayer) does. Reacting here would settle that
    // owner's delivery out from under it via noteBackgroundStall → pauseDelivery.
    if (this._state === 'idle' || this._state === 'disabled') {
      return;
    }
    if (this._state !== 'loading') {
      this.noteBackgroundStall();
      return;
    }
    if (this.pendingHole && !this.pendingHole.verified) {
      if (this.fetcher.stitchConflicts > this.pendingHole.conflictsAtAim) {
        this.onProbeConflicted();
        return;
      }
      this.pendingHole.verified = true;
      // Settle the aim so its watchdog stops re-arming at probe cadence and
      // runway maintenance (gated on `collecting`) comes back to life.
      if (this.fetcher.probing) {
        this.fetcher.pauseDelivery();
      }
      this.retryPending();
      return;
    }
    if (!this.pendingStep && !this.pendingHole) {
      // Decode-driven loading: the stall belongs to a background aim.
      this.config.logger?.debug?.('[FrameStepper] background aim stalled');
      this.noteBackgroundStall();
      return;
    }
    this.stallStrikes++;
    if (this.stallStrikes >= 3) {
      this.config.logger?.warn?.('[FrameStepper] backfill stalled — abandoning the wait');
      this.abandonWait();
    }
  }

  /**
   * Stalls on an aim no user wait owns (background extends, or an aim orphaned
   * by an earlier give-up). Bounded then settled: an unsettled aim re-arms its
   * watchdog at stall cadence forever while runway maintenance gates on
   * `collecting`. The next step re-aims on demand.
   */
  private noteBackgroundStall(): void {
    this.backgroundStalls++;
    if (this.backgroundStalls < 3) {
      return;
    }
    this.backgroundStalls = 0;
    if (this.fetcher.state === 'collecting') {
      this.config.logger?.warn?.(
        '[FrameStepper] unowned aim stalled repeatedly — settling it',
      );
      this.fetcher.pauseDelivery();
    }
  }

  /**
   * The probe's delivery conflicted away instead of inserting: data exists in
   * the gap (anchor failure, not absence). Re-aim once; if conflicts persist,
   * abandon with the hole unverified — never verify-empty, never a boundary.
   */
  private onProbeConflicted(): void {
    const hole = this.pendingHole;
    const store = this.fetcher.store;
    if (hole && store && !hole.reaimed) {
      hole.reaimed = true;
      hole.conflictsAtAim = this.fetcher.stitchConflicts;
      this.config.logger?.warn?.(
        '[FrameStepper] hole probe conflicted — re-aiming for a fresh anchor',
      );
      if (this.fetcher.refetchHole(
        store.ticksToEpochMs((hole.lowTicks + hole.highTicks) / 2),
      )) {
        return;
      }
    }
    this.config.logger?.warn?.(
      '[FrameStepper] hole probe conflicts persisted — abandoning the wait',
    );
    this.abandonWait();
  }

  /**
   * The fetcher abandoned an aim because stitch conflicts persisted across a
   * fresh anchor: data exists (it conflicted, not absent), so this never
   * verifies a hole and never concludes a no-earlier-data boundary.
   */
  private onConflictFailed(): void {
    if (!this.pendingStep && !this.pendingHole) {
      this.backgroundMislands++;
      return;
    }
    this.config.logger?.warn?.('[FrameStepper] aim abandoned on persistent stitch conflicts');
    this.abandonWait();
  }

  /**
   * Window mis-lands: strike only while a step waits on the aim; persistent
   * misses end the wait as an honest boundary — server mis-positioning alone
   * never disables the feature.
   */
  private onLandingFailed(): void {
    if (!this.pendingStep && !this.pendingHole) {
      this.backgroundMislands++;
      return;
    }
    this.landingFailures++;
    if (this.landingFailures >= 2) {
      this.onNoEarlierData('window landing failed repeatedly');
      return;
    }
    // Recoverable: surface plain stepping; the next user step re-aims.
    this.abandonWait();
  }

  /**
   * Honest boundary: nothing earlier is reachable (archive start, or the
   * server lands forward of every ask). Stepping stays alive — within-runway
   * steps work, a prev click at the boundary is a graceful no-op.
   */
  private onNoEarlierData(why: string): void {
    const waiting = this.pendingStep !== null || this.pendingHole !== null;
    if (!waiting) {
      this.backgroundMislands++;
    }
    const oldest = this.fetcher.store?.coverage()[0]?.startTicks;
    if (oldest !== undefined) {
      this.noOlderDataFloorTicks = oldest;
    }
    this.zeroGrowthExtends = 0;
    this.config.logger?.info?.(`[FrameStepper] no earlier frame: ${why}`);
    this.abandonWait();
    if (waiting) {
      this.emit('noearlierframe', undefined);
    }
  }

  /** Boundary self-heals: backward growth below the floor re-enables extends. */
  private atNoOlderDataBoundary(store: SampleStore): boolean {
    if (this.noOlderDataFloorTicks === null) {
      return false;
    }
    const oldest = store.coverage()[0]?.startTicks;
    return oldest === undefined || oldest >= this.noOlderDataFloorTicks;
  }

  /** A prev click at a known boundary: no cursor move, no aim, no spinner. */
  private declineNoEarlierFrame(): void {
    this.config.logger?.info?.('[FrameStepper] no earlier frame: at the start of available data');
    this.abandonWait();
    this.emit('noearlierframe', undefined);
  }

  /**
   * A user-driven extendBack that completes without backward growth found
   * nothing older (dupes-only delivery); two in a row conclude the
   * boundary instead of churning re-aims forever.
   */
  private noteExtendOutcome(): void {
    if (this.userExtendFloorTicks === null) {
      return;
    }
    const aimedFloorTicks = this.userExtendFloorTicks;
    this.userExtendFloorTicks = null;
    const oldest = this.fetcher.store?.coverage()[0]?.startTicks;
    if (oldest !== undefined && oldest < aimedFloorTicks) {
      this.zeroGrowthExtends = 0;
      return;
    }
    this.zeroGrowthExtends++;
    if (this.zeroGrowthExtends >= 2 && this.pendingStep) {
      this.onNoEarlierData('extendBack reached the start of available data');
    }
  }

  /** End the current wait without ending stepping (never wedge in loading). */
  private abandonWait(): void {
    // A wait that owned the in-flight aim (gap probe or user-driven extend)
    // leaves it orphaned on abandon — its watchdog re-arms at stall cadence
    // forever while runway maintenance gates on `collecting`. Settle it.
    // Background aims settle through their own bound, not here.
    if (this.fetcher.probing
      || (this.userExtendFloorTicks !== null && this.fetcher.state === 'collecting')) {
      this.fetcher.pauseDelivery();
    }
    this.pendingStep = null;
    this.pendingHole = null;
    this.userExtendFloorTicks = null;
    if (this._state === 'loading') {
      this.emit('loading', false);
      this.setState('stepping');
    }
  }

  /**
   * One bounded rebuild: sessions die for transient reasons (idle paused DC
   * reaped during a long pause, ICE blip). Only consecutive losses with no
   * healthy delivery between them disable. The reopen has no timer of its own,
   * so the StreamManager's ~2 s open-rate pacing is tolerated by construction.
   */
  private onSessionLost(): void {
    if (this._state === 'idle' || this._state === 'disabled') {
      return;
    }
    this.sessionLosses++;
    if (this.sessionLosses >= 2) {
      this.disable('fetch session lost');
      return;
    }
    const store = this.fetcher.store;
    const anchorMs = store ? store.ticksToEpochMs(this.cursorTicks) : this.cursorTicks;
    this.config.logger?.warn?.('[FrameStepper] fetch session lost — rebuilding once');
    void this.fetcher.openAtAnchor(anchorMs).catch(() => {
      this.disable('fetch session lost');
    });
  }

  private beginLoading(pending: 'prev' | 'next' | null): void {
    if (pending) this.pendingStep = pending;
    if (this._state !== 'loading') {
      this.setState('loading');
      this.emit('loading', true);
    }
  }

  private endLoading(): void {
    if (this._state === 'loading') {
      this.emit('loading', false);
    }
    this.setState('stepping');
  }

  private retryPending(): void {
    if (this._state !== 'loading' || !this.pendingStep) return;
    const direction = this.pendingStep;
    this.pendingStep = null;
    this.setState('stepping');
    this.emit('loading', false);
    void this.performStep(direction);
  }

  // ── Private: decoder lifecycle ────────────────────────────────────────

  private ensureDecoder(): GopDecoder | null {
    if (this.decoder && !this.decoder.failed && !this.decoder.disposed) {
      return this.decoder;
    }
    // The codec config travels with each run; the decoder needs only the
    // container timescale to construct.
    const timescale = this.fetcher.init?.videoTrack?.timescale;
    if (!timescale) {
      this.disable('no decoder configuration available');
      return null;
    }
    this.decoder = this.config.createDecoder
      ? this.config.createDecoder(timescale)
      : new GopDecoder({
          timescale,
          byteCapBytes: this.config.decoderByteCap,
          logger: this.config.logger,
        });
    return this.decoder;
  }

  private onDecodeFailure(err: unknown, target: StoreSample, direction: 'prev' | 'next'): void {
    this.decoderFailures++;
    this.config.logger?.warn?.(
      `[FrameStepper] decode failure #${this.decoderFailures}`, err,
    );
    this.decoder?.dispose();
    this.decoder = null;
    if (this.decoderFailures >= 2) {
      this.disable('decoder failed twice');
      return;
    }
    // One recreate-and-retry.
    void this.decodeAndPaint(target, direction);
  }

  private disable(reason: string): void {
    if (this._state === 'disabled') return;
    this.config.logger?.error?.(`[FrameStepper] disabled: ${reason}`);
    this.stepToken++;
    this.pendingStep = null;
    this.pendingAnchor = null;
    this.pendingHole = null;
    this.decoder?.dispose();
    this.decoder = null;
    // A dead feature must not keep a session streaming/inserting.
    this.fetcher.pauseDelivery();
    this.setState('disabled');
    this.emit('disabled', reason);
  }

  private setState(state: FrameStepperState): void {
    this._state = state;
  }

  private emit<K extends FrameStepperEvent>(
    event: K,
    detail: FrameStepperEventMap[K],
  ): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
