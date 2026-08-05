// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, beforeEach } from 'vitest';
import { DiagTracker } from '../../src/utils/diag-tracker';

// CLOUD-16679: diag recording ships always-on in prod and never evicts its
// per-fetch-session timelines (`connectionKey:fetch#N` keys), so archive
// scrubbing slowly grows the Map. Gate recording OFF by default; a dev opts in
// via __webrtcDiag.enable() for a debug session.
describe('DiagTracker recording gate', () => {
  let tracker: DiagTracker;
  beforeEach(() => {
    tracker = new DiagTracker();
  });

  it('is disabled by default', () => {
    expect(tracker.isEnabled).toBe(false);
  });

  it('does not store timelines while disabled (no fetch-session leak)', () => {
    tracker.startCamera('cam1:fetch#1');
    tracker.startCamera('cam1:fetch#2');
    expect(tracker.raw.size).toBe(0);
    expect(tracker.get('cam1:fetch#1')).toBeNull();
  });

  it('still returns a usable timeline object while disabled', () => {
    const t = tracker.startCamera('cam1');
    expect(t.connectionKey).toBe('cam1');
  });

  it('records once enabled', () => {
    tracker.enable();
    tracker.startCamera('cam1:fetch#1');
    expect(tracker.raw.size).toBe(1);
    expect(tracker.get('cam1:fetch#1')?.connectionKey).toBe('cam1:fetch#1');
  });

  it('stops growing after disable()', () => {
    tracker.enable();
    tracker.startCamera('cam1:fetch#1');
    tracker.disable();
    tracker.startCamera('cam1:fetch#2');
    expect(tracker.raw.size).toBe(1);
  });

  it('phase/milestone recording no-op while disabled', () => {
    tracker.startCamera('cam1');
    tracker.phaseStart('cam1', 'x');
    tracker.milestone('cam1', 'wsOpenMs');
    expect(tracker.raw.size).toBe(0);
  });
});
