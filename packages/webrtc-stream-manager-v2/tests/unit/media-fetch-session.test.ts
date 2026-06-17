// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock PeerConnectionWrapper ─────────────────────────────────────────────
// Defined via vi.hoisted so the class is available inside the vi.mock factory.

const { pcwState, MockPeerConnectionWrapper } = vi.hoisted(() => {
  const pcwState = { instances: [] as any[] };

  /**
   * Minimal mock reproducing the PeerConnectionWrapper surface used by
   * MediaFetchSession: constructor config, typed events, state, data-channel
   * verbs, stored deliveryMethod detail, and dispose.
   */
  class MockPeerConnectionWrapper {
    private _ac = new AbortController();
    private _emitter = new EventTarget();
    private _state = 'connecting';

    config: any;
    dataChannelOpen = false;
    deliveryMethod: { method: string; mime?: string } | null = null;

    sendSeek = vi.fn();
    sendPause = vi.fn().mockReturnValue(true);
    sendResume = vi.fn().mockReturnValue(true);
    dispose = vi.fn().mockImplementation(() => {
      this._ac.abort();
    });

    constructor(config: any) {
      this.config = config;
      pcwState.instances.push(this);
    }

    get disposed() {
      return this._ac.signal.aborted;
    }

    get state() {
      return this._state;
    }

    on = vi
      .fn()
      .mockImplementation(
        (event: string, listener: (...args: any[]) => void): (() => void) => {
          const handler = (evt: Event) => {
            const detail = (evt as CustomEvent).detail;
            if (detail !== undefined) {
              listener(detail);
            } else {
              listener();
            }
          };
          this._emitter.addEventListener(event, handler);
          return () => this._emitter.removeEventListener(event, handler);
        },
      );

    emit(event: string, detail?: unknown) {
      this._emitter.dispatchEvent(new CustomEvent(event, { detail }));
    }

    /** Test helper: drive the PC to connected. */
    simulateConnected() {
      const previousState = this._state;
      this._state = 'connected';
      this.emit('statechange', { state: 'connected', previousState });
    }

    /** Test helper: drive the PC to failed. */
    simulateFailed() {
      const previousState = this._state;
      this._state = 'failed';
      this.emit('statechange', { state: 'failed', previousState });
    }
  }

  return { pcwState, MockPeerConnectionWrapper };
});

vi.mock('../../src/core/peer-connection', () => ({
  PeerConnectionWrapper: MockPeerConnectionWrapper,
}));

// ─── Imports (after mock setup) ─────────────────────────────────────────────

import {
  MediaFetchSession,
  type MediaFetchSessionConfig,
} from '../../src/core/media-fetch-session';
import { ConnectionError, PeerState } from '../../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

type MockPcw = InstanceType<typeof MockPeerConnectionWrapper>;

function getPcw(index: number): MockPcw {
  const inst = pcwState.instances[index];
  if (!inst) {
    throw new Error(
      `No MockPeerConnectionWrapper at index ${index} (have ${pcwState.instances.length})`,
    );
  }
  return inst;
}

/** Wait until `count` PCW instances have been constructed. */
async function waitForPcwCount(count: number): Promise<void> {
  await vi.waitFor(() => {
    expect(pcwState.instances.length).toBeGreaterThanOrEqual(count);
  });
}

function makeSession(
  overrides: Partial<MediaFetchSessionConfig> = {},
): MediaFetchSession {
  return new MediaFetchSession({
    sessionKey: 'sys1:cam1:fetch',
    signalingUrl: () => 'wss://relay.example.com/rest/v3/devices/cam1/webrtc',
    // Fast retries so tests don't sit in back-off sleeps.
    retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
    ...overrides,
  });
}

/** Connect a session and drive its first PCW to connected. */
async function connectSession(session: MediaFetchSession): Promise<MockPcw> {
  const promise = session.connect();
  await waitForPcwCount(1);
  const pcw = getPcw(0);
  pcw.simulateConnected();
  await promise;
  return pcw;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MediaFetchSession', () => {
  beforeEach(() => {
    pcwState.instances = [];
  });

  // ── Connect lifecycle ───────────────────────────────────────────────

  it('connect() resolves when the peer connection reaches connected', async () => {
    const session = makeSession();

    const pcw = await connectSession(session);

    expect(session.state).toBe(PeerState.connected);
    expect(pcw.dispose).not.toHaveBeenCalled();
    session.dispose();
  });

  it('passes sessionKey as the diag key and forwards iceServers/logger to the PCW', async () => {
    const iceServers = [{ urls: 'stun:stun.example.com' }];
    const logger = console;
    const session = makeSession({ iceServers, logger });

    const pcw = await connectSession(session);

    expect(pcw.config.diagConnectionKey).toBe('sys1:cam1:fetch');
    expect(pcw.config.iceServers).toBe(iceServers);
    expect(pcw.config.logger).toBe(logger);
    session.dispose();
  });

  it('calls the signalingUrl factory fresh on every attempt (fresh tickets)', async () => {
    let calls = 0;
    const signalingUrl = vi.fn(() => `wss://h/devices/c/webrtc?attempt=${++calls}`);
    const session = makeSession({ signalingUrl });

    const promise = session.connect();
    await waitForPcwCount(1);
    getPcw(0).simulateFailed();
    await waitForPcwCount(2);
    getPcw(1).simulateConnected();
    await promise;

    expect(signalingUrl).toHaveBeenCalledTimes(2);
    expect(getPcw(0).config.signalingUrl).toContain('attempt=1');
    expect(getPcw(1).config.signalingUrl).toContain('attempt=2');
    // The failed attempt's PCW was disposed.
    expect(getPcw(0).dispose).toHaveBeenCalled();
    expect(getPcw(1).dispose).not.toHaveBeenCalled();
    session.dispose();
  });

  it('connect() rejects after the bounded retry is exhausted', async () => {
    const session = makeSession();

    const promise = session.connect();
    const rejection = expect(promise).rejects.toBe(
      ConnectionError.lostConnection,
    );
    await waitForPcwCount(1);
    getPcw(0).simulateFailed();
    await waitForPcwCount(2);
    getPcw(1).simulateFailed();
    await rejection;

    expect(getPcw(0).dispose).toHaveBeenCalled();
    expect(getPcw(1).dispose).toHaveBeenCalled();
    // The session reports the terminal state, not a phantom 'connecting'.
    expect(session.state).toBe(PeerState.failed);
    session.dispose();
  });

  it('dispose during the signalingUrl await aborts before any PCW is created', async () => {
    let releaseUrl!: (url: string) => void;
    const session = makeSession({
      signalingUrl: () =>
        new Promise<string>((resolve) => {
          releaseUrl = resolve;
        }),
    });

    const promise = session.connect();
    const rejection = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });
    // Dispose while the ticket fetch is still pending.
    await vi.waitFor(() => expect(releaseUrl).toBeDefined());
    session.dispose();
    releaseUrl('wss://relay.example.com/rest/v3/devices/cam1/webrtc');
    await rejection;

    expect(pcwState.instances.length).toBe(0);
  });

  it('dispose between connected and attach disposes the PCW and rejects', async () => {
    const session = makeSession();

    const promise = session.connect();
    const rejection = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });
    await waitForPcwCount(1);
    const pcw = getPcw(0);
    // Resolve the connection and dispose in the same task — the session's
    // disposed check runs in the microtask continuation after both.
    pcw.simulateConnected();
    session.dispose();
    await rejection;

    expect(pcw.dispose).toHaveBeenCalled();
  });

  it('dispose during the retry back-off sleep aborts without a second attempt', async () => {
    // Long real-timer back-off: the test only passes promptly if dispose
    // short-circuits the sleep instead of waiting it out.
    const session = makeSession({
      retry: { maxAttempts: 2, baseDelayMs: 60_000, maxDelayMs: 60_000 },
    });

    const promise = session.connect();
    const rejection = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });
    await waitForPcwCount(1);
    getPcw(0).simulateFailed();
    // Let withRetry process the failure and enter the back-off sleep —
    // disposing earlier rethrows the original error instead (also valid,
    // but then the sleep path itself would go untested).
    await new Promise((resolve) => setTimeout(resolve, 25));

    session.dispose();
    await rejection;

    expect(pcwState.instances.length).toBe(1);
  });

  it('connect() is single-shot: repeated calls return the same promise', async () => {
    const session = makeSession();

    const first = session.connect();
    const second = session.connect();
    expect(first).toBe(second);

    await waitForPcwCount(1);
    getPcw(0).simulateConnected();
    await first;

    expect(pcwState.instances.length).toBe(1);
    session.dispose();
  });

  it('connect() throws after dispose', () => {
    const session = makeSession();
    session.dispose();

    expect(() => session.connect()).toThrow('disposed');
  });

  it('dispose during connect aborts the attempt and disposes the pending PCW', async () => {
    const session = makeSession();

    const promise = session.connect();
    const rejection = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });
    await waitForPcwCount(1);

    session.dispose();
    await rejection;

    expect(getPcw(0).dispose).toHaveBeenCalled();
  });

  it('parent signal abort cascades disposal', () => {
    const parent = new AbortController();
    const session = makeSession({ parentSignal: parent.signal });

    expect(session.disposed).toBe(false);
    parent.abort();
    expect(session.disposed).toBe(true);
  });

  // ── Event forwarding ────────────────────────────────────────────────

  it('forwards buffer, timestamp, confirmation, and datachannel events', async () => {
    const session = makeSession();
    const buffers: ArrayBuffer[] = [];
    const timestamps: unknown[] = [];
    let confirmations = 0;
    const raw: unknown[] = [];
    session.on('buffer', (data) => buffers.push(data));
    session.on('timestamp', (detail) => timestamps.push(detail));
    session.on('confirmation', () => confirmations++);
    session.on('datachannel', (data) => raw.push(data));

    const pcw = await connectSession(session);

    const bytes = new ArrayBuffer(8);
    pcw.emit('buffer', bytes);
    pcw.emit('timestamp', { timestampMs: 1000, rtpTimestamp: 15360 });
    pcw.emit('confirmation');
    pcw.emit('datachannel', '{"status":200}');

    expect(buffers).toEqual([bytes]);
    expect(timestamps).toEqual([{ timestampMs: 1000, rtpTimestamp: 15360 }]);
    expect(confirmations).toBe(1);
    expect(raw).toEqual(['{"status":200}']);
    session.dispose();
  });

  it('replays a deliverymethod detail that arrived during signaling, exactly once', async () => {
    const session = makeSession();
    const details: unknown[] = [];
    session.on('deliverymethod', (detail) => details.push(detail));

    const promise = session.connect();
    await waitForPcwCount(1);
    const pcw = getPcw(0);
    // MimeInit arrives during signaling, before the session attaches.
    pcw.deliveryMethod = { method: 'mse', mime: 'video/mp4; codecs="avc1.640028"' };
    pcw.simulateConnected();
    await promise;

    expect(details).toEqual([
      { method: 'mse', mime: 'video/mp4; codecs="avc1.640028"' },
    ]);
    expect(session.mime).toBe('video/mp4; codecs="avc1.640028"');
    session.dispose();
  });

  it('deliverymethod is first-wins: a late DC-borne MimeInit does not double-emit', async () => {
    const session = makeSession();
    const details: unknown[] = [];
    session.on('deliverymethod', (detail) => details.push(detail));

    const promise = session.connect();
    await waitForPcwCount(1);
    const pcw = getPcw(0);
    pcw.deliveryMethod = { method: 'mse', mime: 'video/mp4; codecs="avc1.640028"' };
    pcw.simulateConnected();
    await promise;

    // The real PCW re-emits deliverymethod for a MimeInit arriving over the
    // data channel after signaling closes — the session must swallow it.
    pcw.emit('deliverymethod', {
      method: 'mse',
      mime: 'video/mp4; codecs="avc1.640028"',
    });

    expect(details).toHaveLength(1);
    session.dispose();
  });

  it('forwards dcopen and replays it if the channel opened before attach', async () => {
    // Live path: dcopen after connect.
    const session = makeSession();
    let opens = 0;
    session.on('dcopen', () => opens++);
    const pcw = await connectSession(session);
    pcw.emit('dcopen');
    expect(opens).toBe(1);
    session.dispose();

    // Replay path: channel already open at attach time.
    pcwState.instances = [];
    const session2 = makeSession();
    let opens2 = 0;
    session2.on('dcopen', () => opens2++);
    const promise = session2.connect();
    await waitForPcwCount(1);
    const pcw2 = getPcw(0);
    pcw2.dataChannelOpen = true;
    pcw2.simulateConnected();
    await promise;
    expect(opens2).toBe(1);
    session2.dispose();
  });

  it('emits error once on post-connect failure and does NOT reconnect', async () => {
    const session = makeSession();
    const errors: unknown[] = [];
    const states: unknown[] = [];
    session.on('error', (err) => errors.push(err));
    session.on('statechange', (detail) => states.push(detail));

    const pcw = await connectSession(session);
    pcw.simulateFailed();

    expect(errors).toEqual([ConnectionError.lostConnection]);
    expect(states).toEqual([
      { state: 'failed', previousState: 'connected' },
    ]);
    // No replacement PCW was created.
    expect(pcwState.instances.length).toBe(1);
    expect(session.state).toBe(PeerState.failed);
    session.dispose();
  });

  it('treats a data-channel close as terminal: error once, state failed', async () => {
    const session = makeSession();
    const errors: unknown[] = [];
    session.on('error', (err) => errors.push(err));

    const pcw = await connectSession(session);
    pcw.dataChannelOpen = true;

    // Server closes the DC while ICE/connectionState stay 'connected' —
    // the only loss signal a data-only session gets.
    pcw.emit('dcclose');

    expect(errors).toEqual([ConnectionError.lostConnection]);
    expect(session.state).toBe(PeerState.failed);

    // A subsequent PeerState.failed must not double-emit the error.
    pcw.simulateFailed();
    expect(errors).toHaveLength(1);
    expect(pcwState.instances.length).toBe(1);
    session.dispose();
  });

  it('state reports failed after dispose, not a phantom connecting', async () => {
    const session = makeSession();
    expect(session.state).toBe(PeerState.connecting);

    await connectSession(session);
    expect(session.state).toBe(PeerState.connected);

    session.dispose();
    expect(session.state).toBe(PeerState.failed);
  });

  // ── Data-channel verbs ──────────────────────────────────────────────

  it('verbs return false before the data channel is open', async () => {
    const session = makeSession();

    // Before connect: no PCW at all.
    expect(session.seek(123)).toBe(false);
    expect(session.dataChannelOpen).toBe(false);

    const pcw = await connectSession(session);
    pcw.sendPause.mockReturnValue(false);
    pcw.sendResume.mockReturnValue(false);

    // Connected but DC not open yet.
    expect(session.seek(123)).toBe(false);
    expect(pcw.sendSeek).not.toHaveBeenCalled();
    expect(session.pause()).toBe(false);
    expect(session.resume()).toBe(false);
    session.dispose();
  });

  it('verbs call through once the data channel is open', async () => {
    const session = makeSession();
    const pcw = await connectSession(session);
    pcw.dataChannelOpen = true;

    expect(session.seek(1748900000000)).toBe(true);
    expect(pcw.sendSeek).toHaveBeenCalledWith(1748900000000);
    expect(session.pause()).toBe(true);
    expect(pcw.sendPause).toHaveBeenCalled();
    expect(session.resume()).toBe(true);
    expect(pcw.sendResume).toHaveBeenCalled();
    expect(session.dataChannelOpen).toBe(true);
    session.dispose();
  });

  // ── Disposal ────────────────────────────────────────────────────────

  it('dispose() tears down the PCW and is idempotent', async () => {
    const session = makeSession();
    const pcw = await connectSession(session);

    session.dispose();
    expect(pcw.dispose).toHaveBeenCalledTimes(1);
    expect(session.disposed).toBe(true);

    // Second dispose is a no-op.
    session.dispose();
    expect(pcw.dispose).toHaveBeenCalledTimes(1);
  });

  it('events stop forwarding after dispose', async () => {
    const session = makeSession();
    const buffers: ArrayBuffer[] = [];
    session.on('buffer', (data) => buffers.push(data));
    const pcw = await connectSession(session);

    session.dispose();
    pcw.emit('buffer', new ArrayBuffer(4));

    expect(buffers).toEqual([]);
  });
});
