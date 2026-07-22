// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import type { BackfillFetcher } from './backfill-fetcher';
import type { FrameStepper } from './frame-stepper';
import type { ReversePlayer, ReverseRate } from './reverse-player';
import type { Logger } from '../types';

export type PlaybackMode = 'idle' | 'stepping' | 'reverse' | 'disabled';

export interface PlaybackCoordinatorConfig {
  /** Shared with both engines (they are mode-exclusive consumers). */
  fetcher: BackfillFetcher;
  stepper: FrameStepper;
  player: ReversePlayer;
  logger?: Logger;
}

/**
 * Owns the {@link ReversePlayer} lifecycle and the reverse↔stepping handoffs
 * over the shared {@link BackfillFetcher}/store. The tile drives forward
 * prev-frame stepping directly on the {@link FrameStepper} (only while paused,
 * so it is naturally mutually exclusive with reverse); this coordinator enters
 * reverse, hands OFF into stepping when reverse pauses or autostops, and tracks
 * the resulting {@link PlaybackCoordinator.mode}. Both engines otherwise stay
 * independent — the tile subscribes to each engine's `frame`/state events
 * directly for painting and reporting.
 */
export class PlaybackCoordinator {
  private readonly cfg: PlaybackCoordinatorConfig;
  private readonly cleanups: (() => void)[] = [];
  private readonly emitter = new EventTarget();
  private mode_: PlaybackMode = 'idle';

  constructor(cfg: PlaybackCoordinatorConfig) {
    this.cfg = cfg;
    this.cleanups.push(
      cfg.player.on('autostopped', (detail) => this.onAutostopped(detail)),
      cfg.player.on('disabled', () => this.setMode('disabled')),
      cfg.stepper.on('disabled', () => this.setMode('disabled')),
      // Forward stepping past the entry anchor: leave stepping for plain video.
      cfg.stepper.on('exitforward', () => this.exit()),
    );
  }

  get mode(): PlaybackMode {
    return this.mode_;
  }

  // ── Scrub ──────────────────────────────────────────────────────────────

  /** Scrub-while-reversing (re-aim the player) or scrub-while-stepping. */
  reanchor(anchorMs: number): void {
    if (this.mode_ === 'reverse') {
      this.cfg.player.play(anchorMs, this.cfg.player.rate);
    } else if (this.mode_ === 'stepping') {
      this.cfg.stepper.reanchor(anchorMs);
    }
  }

  // ── Reverse ────────────────────────────────────────────────────────────

  /** Enter (or re-anchor) continuous reverse. Warm entry from stepping paints immediately. */
  playReverse(rate: ReverseRate, anchorMs?: number): void {
    if (this.mode_ === 'disabled') return;
    const anchor = anchorMs
      ?? this.cfg.stepper.cursorEpochMs
      ?? this.cfg.player.cursorEpochMs;
    if (anchor == null) {
      throw new Error('playReverse without an anchor (no stepper cursor and none supplied)');
    }
    this.exitStepperIfActive();
    this.cfg.player.play(anchor, rate);
    this.setMode('reverse');
  }

  setReverseRate(rate: ReverseRate): void {
    if (this.mode_ === 'reverse') this.cfg.player.setRate(rate);
  }

  /** Pause reverse → warm stepping at the player's cursor (instant prev/next). */
  pauseReverse(): void {
    if (this.mode_ !== 'reverse') return;
    const cursor = this.cfg.player.cursorEpochMs;
    this.cfg.player.stop();
    if (cursor != null) {
      this.cfg.stepper.enterStepping(cursor);
      this.setMode('stepping');
    } else {
      this.setMode('idle');
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Everything → idle, delivery paused. */
  exit(): void {
    this.stopPlayerIfActive();
    this.cfg.stepper.exit();
    if (this.mode_ !== 'disabled') this.setMode('idle');
  }

  on(event: 'modechange', listener: (mode: PlaybackMode) => void): () => void {
    const handler = (evt: Event) => listener((evt as CustomEvent).detail as PlaybackMode);
    this.emitter.addEventListener(event, handler);
    return () => this.emitter.removeEventListener(event, handler);
  }

  dispose(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.length = 0;
    this.cfg.player.dispose();
    this.cfg.stepper.dispose();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private onAutostopped(detail: { reason: 'archive-start' | 'supply-stalled'; cursorEpochMs: number | null }): void {
    // The player stopped itself (archive start / supply). Land in stepping at
    // the cursor so prev/next keep working; the tile re-emits the report.
    if (detail.cursorEpochMs) {
      this.cfg.stepper.enterStepping(detail.cursorEpochMs);
      this.setMode('stepping');
    } else {
      this.setMode('idle');
    }
  }

  private stopPlayerIfActive(): void {
    if (this.cfg.player.state !== 'idle' && this.cfg.player.state !== 'disabled') {
      this.cfg.player.stop();
    }
  }

  private exitStepperIfActive(): void {
    if (this.cfg.stepper.state !== 'idle' && this.cfg.stepper.state !== 'disabled') {
      this.cfg.stepper.exit();
    }
  }

  private setMode(mode: PlaybackMode): void {
    if (this.mode_ === mode) return;
    this.mode_ = mode;
    this.emitter.dispatchEvent(new CustomEvent('modechange', { detail: mode }));
  }
}
