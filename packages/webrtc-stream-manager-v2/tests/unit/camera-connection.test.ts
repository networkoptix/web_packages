// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock PeerConnectionWrapper ─────────────────────────────────────────────
// Defined via vi.hoisted so the class is available inside the vi.mock factory
// (which vitest hoists above all other imports).

const { mockState, MockPCW } = vi.hoisted(() => {
  const mockState = { instances: [] as any[] };

  /**
   * Minimal mock that reproduces the PeerConnectionWrapper surface used by
   * CameraConnection: constructor config, state, on/emit, dispose, and
   * data-channel forwarding stubs.
   */
  class MockPCW {
    private _ac = new AbortController();
    private _emitter = new EventTarget();
    private _state = 'connecting';

    signalingUrl: string;
    iceServers?: RTCIceServer[];

    get state() {
      return this._state;
    }
    get disposed() {
      return this._ac.signal.aborted;
    }
    get signal() {
      return this._ac.signal;
    }

    sendStreamRequest = vi.fn();
    sendSeek = vi.fn();
    sendPause = vi.fn().mockReturnValue(true);
    sendResume = vi.fn().mockReturnValue(true);
    sendNextFrame = vi.fn().mockReturnValue(true);
    getStats = vi.fn().mockResolvedValue(new Map());

    private _deliveryMethodDetail: any = null;
    private _transcodingDetail: any = null;
    private _activeStream: MediaStream | null = null;
    private _dataChannelOpen = false;

    get deliveryMethod() {
      return this._deliveryMethodDetail;
    }

    get transcoding() {
      return this._transcodingDetail;
    }

    get activeStream(): MediaStream | null {
      return this._activeStream;
    }

    get dataChannelOpen(): boolean {
      return this._dataChannelOpen;
    }

    constructor(config: {
      signalingUrl: string;
      iceServers?: RTCIceServer[];
      parentSignal?: AbortSignal;
    }) {
      this.signalingUrl = config.signalingUrl;
      this.iceServers = config.iceServers;

      if (config.parentSignal) {
        const onAbort = () => this.dispose();
        config.parentSignal.addEventListener('abort', onAbort, {
          signal: this._ac.signal,
        });
      }

      mockState.instances.push(this);
    }

    on(event: string, listener: (...args: any[]) => void): () => void {
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
    }

    async dispose(): Promise<void> {
      if (this.disposed) return;
      this._ac.abort();
    }

    // ── Simulation helpers (test-only) ────────────────────────────────

    simulateStateChange(state: string): void {
      if (this.disposed) return;
      const prev = this._state;
      this._state = state;
      this._emitter.dispatchEvent(
        new CustomEvent('statechange', {
          detail: { state, previousState: prev },
        }),
      );
    }

    simulateTrack(track: any, streams: any[]): void {
      if (this.disposed) return;
      this._emitter.dispatchEvent(
        new CustomEvent('track', { detail: { track, streams } }),
      );
    }

    simulateTimestamp(detail: any): void {
      if (this.disposed) return;
      this._emitter.dispatchEvent(
        new CustomEvent('timestamp', { detail }),
      );
    }

    simulateBuffer(data: ArrayBuffer): void {
      if (this.disposed) return;
      this._emitter.dispatchEvent(
        new CustomEvent('buffer', { detail: data }),
      );
    }

    simulateTranscoding(detail: { video: boolean; audio?: boolean }): void {
      if (this.disposed) return;
      this._transcodingDetail = detail;
      this._emitter.dispatchEvent(
        new CustomEvent('transcoding', { detail }),
      );
    }

    /** Set transcoding detail without emitting (simulates pre-connected state). */
    setStoredTranscoding(detail: { video: boolean; audio?: boolean }): void {
      this._transcodingDetail = detail;
    }

    simulateDeliveryMethod(detail: { method: string; mime?: string }): void {
      if (this.disposed) return;
      this._deliveryMethodDetail = detail;
      this._emitter.dispatchEvent(
        new CustomEvent('deliverymethod', { detail }),
      );
    }

    /** Flip the DC-open flag and fire 'dcopen', mirroring what real PCW does after SCTP open. */
    simulateDcOpen(): void {
      if (this.disposed) return;
      this._dataChannelOpen = true;
      this._emitter.dispatchEvent(new CustomEvent('dcopen'));
    }

    /** Set the dcopen flag without firing the event (for the synchronous-replay path inside setBasePc/setUpgradePc). */
    setDataChannelOpen(open: boolean): void {
      this._dataChannelOpen = open;
    }
  }

  return { mockState, MockPCW };
});

vi.mock('../../src/core/peer-connection', () => ({
  PeerConnectionWrapper: MockPCW,
}));

// ─── Mock MseRenderer ────────────────────────────────────────────────────────

const { mockMseState, MockMseRenderer } = vi.hoisted(() => {
  const mockMseState = { instances: [] as any[] };

  class MockMseRenderer {
    private _ac = new AbortController();
    private _emitter = new EventTarget();

    get disposed() {
      return this._ac.signal.aborted;
    }
    get signal() {
      return this._ac.signal;
    }
    get stream() {
      return null;
    }

    appendBuffer = vi.fn();
    dispose = vi.fn().mockImplementation(() => {
      if (this.disposed) return;
      this._ac.abort();
    });

    linkTo(parentSignal: AbortSignal): void {
      parentSignal.addEventListener('abort', () => this.dispose(), {
        signal: this._ac.signal,
      });
    }

    on(event: string, listener: (...args: any[]) => void): () => void {
      const handler = (evt: Event) => {
        const detail = (evt as CustomEvent).detail;
        listener(detail);
      };
      this._emitter.addEventListener(event, handler);
      return () => this._emitter.removeEventListener(event, handler);
    }

    // Test helper: simulate the MseRenderer emitting a stream.
    simulateStream(stream: MediaStream): void {
      this._emitter.dispatchEvent(
        new CustomEvent('stream', { detail: stream }),
      );
    }

    simulateError(err: Error): void {
      this._emitter.dispatchEvent(
        new CustomEvent('error', { detail: err }),
      );
    }

    constructor(_config: { mime: string }) {
      mockMseState.instances.push(this);
    }
  }

  return { mockMseState, MockMseRenderer };
});

vi.mock('../../src/core/mse-renderer', () => ({
  MseRenderer: MockMseRenderer,
}));

// ─── Mock codecs utilities ───────────────────────────────────────────────────

const mockIsMseSupported = vi.fn().mockReturnValue(true);

vi.mock('../../src/utils/codecs', () => ({
  isMseSupported: () => mockIsMseSupported(),
}));

// ─── Imports (after mock setup) ─────────────────────────────────────────────

import {
  CameraConnection,
  type CameraConnectionConfig,
} from '../../src/core/camera-connection';
import {
  PeerState,
  AvailableStreams,
  ConnectionError,
  TargetStream,
} from '../../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

type MockInstance = InstanceType<typeof MockPCW>;

function getMock(index: number): MockInstance {
  const inst = mockState.instances[index];
  if (!inst) {
    throw new Error(
      `No MockPCW at index ${index} (have ${mockState.instances.length})`,
    );
  }
  return inst;
}

/** Create a mock MediaStream with a single video track. */
function makeMockStream(id: string) {
  const trackTarget = new EventTarget();
  const track = Object.assign(trackTarget, {
    kind: 'video',
    id: `track-${id}`,
    readyState: 'live' as MediaStreamTrackState,
  }) as unknown as MediaStreamTrack;
  const stream = {
    id,
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { track, stream };
}

const TEST_CONFIG: CameraConnectionConfig = {
  connectionKey: 'sys1:cam1',
  signalingUrl: (stream) => `wss://example.com/webrtc?stream=${stream}`,
  availableStreams: [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY],
  iceServers: [{ urls: 'stun:stun.example.com' }],
};

/**
 * Common setup: create a CameraConnection and connect the low-res PCW.
 * Returns references to both for further interaction.
 */
async function setupWithLowConnected(config = TEST_CONFIG) {
  const cc = new CameraConnection(config);
  // Flush microtasks to let the async signalingUrl resolve and create the PCW.
  await vi.advanceTimersByTimeAsync(0);
  const lowPcw = getMock(0);

  // Simulate low-res reaching 'connected' state.
  lowPcw.simulateStateChange(PeerState.connected);
  await vi.advanceTimersByTimeAsync(0);

  return { cc, lowPcw };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CameraConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockState.instances = [];
    mockMseState.instances = [];
    mockIsMseSupported.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. Construction ─────────────────────────────────────────────────

  it('creates low-res connection on construction', async () => {
    new CameraConnection(TEST_CONFIG);
    // Flush microtasks to let the async signalingUrl resolve.
    await vi.advanceTimersByTimeAsync(0);

    expect(mockState.instances).toHaveLength(1);
    expect(getMock(0).signalingUrl).toBe(
      `wss://example.com/webrtc?stream=${AvailableStreams.SECONDARY}`,
    );
    expect(getMock(0).iceServers).toEqual(TEST_CONFIG.iceServers);
  });

  // ── 2. Track forwarding (low-res) ──────────────────────────────────

  it('forwards track events from low-res connection', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    const listener = vi.fn();
    cc.on('track', listener);

    const { track, stream } = makeMockStream('low');
    lowPcw.simulateTrack(track, [stream]);

    expect(listener).toHaveBeenCalledOnce();
    // Track event carries the stable managed stream, not the raw PCW stream.
    const managed = cc.activeStream;
    expect(managed).not.toBeNull();
    expect(managed!.getVideoTracks()).toContain(track);
    expect(listener).toHaveBeenCalledWith({
      track,
      streams: [managed],
    });
  });

  // ── 3. Timestamp forwarding ────────────────────────────────────────

  it('forwards timestamp events from active connection', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    const listener = vi.fn();
    cc.on('timestamp', listener);

    const detail = { timestamp: 1000, rtpTimestamp: 500 };
    lowPcw.simulateTimestamp(detail);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(detail);
  });

  // ── 4. Buffer forwarding ───────────────────────────────────────────

  it('forwards buffer events from active connection', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    const listener = vi.fn();
    cc.on('buffer', listener);

    const data = new ArrayBuffer(16);
    lowPcw.simulateBuffer(data);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(data);
  });

  // ── 5. requestHighRes creates high-res connection ──────────────────

  it('requestHighRes() creates high-res connection with PRIMARY stream URL', async () => {
    const { cc } = await setupWithLowConnected();

    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);

    // A second MockPCW should have been created for high-res.
    expect(mockState.instances).toHaveLength(2);
    expect(getMock(1).signalingUrl).toBe(
      `wss://example.com/webrtc?stream=${AvailableStreams.PRIMARY}`,
    );
  });

  // ── 6. High-res track swap ─────────────────────────────────────────

  it('when high-res connects and receives a track, switches to high-res stream', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Give low a track so we can verify the swap.
    const lowMock = makeMockStream('low');
    lowPcw.simulateTrack(lowMock.track, [lowMock.stream]);

    const trackListener = vi.fn();
    cc.on('track', trackListener);

    // Request high-res.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);

    // Simulate high-res connecting.
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    // High-res is not yet active until a track arrives.
    expect(cc.isHighRes).toBe(false);

    // Simulate high-res track arrival.
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);

    expect(cc.isHighRes).toBe(true);
    const managed = cc.activeStream;
    expect(managed).not.toBeNull();
    expect(managed!.getVideoTracks()).toContain(highMock.track);
    expect(trackListener).toHaveBeenCalledWith({
      track: highMock.track,
      streams: [managed],
    });
  });

  // ── 7. releaseHighRes falls back ───────────────────────────────────

  it('releaseHighRes() disposes high-res and falls back to low', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Set up low track.
    const lowMock = makeMockStream('low');
    lowPcw.simulateTrack(lowMock.track, [lowMock.stream]);

    // Connect high-res with track.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);

    expect(cc.isHighRes).toBe(true);

    const trackListener = vi.fn();
    cc.on('track', trackListener);

    // Release high-res.
    cc.releaseHighRes();

    expect(cc.isHighRes).toBe(false);
    expect(highPcw.disposed).toBe(true);
    const managed = cc.activeStream;
    expect(managed).not.toBeNull();
    expect(managed!.getVideoTracks()).toContain(lowMock.track);

    // A track event should have been emitted with the low-res track.
    expect(trackListener).toHaveBeenCalledOnce();
    expect(trackListener).toHaveBeenCalledWith({
      track: lowMock.track,
      streams: [managed],
    });
  });

  // ── 7b. Managed stream identity is stable across quality switches ───

  it('activeStream is the same object before and after quality switch', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    const lowMock = makeMockStream('low');
    lowPcw.simulateTrack(lowMock.track, [lowMock.stream]);
    const streamAfterLow = cc.activeStream;

    // Upgrade to high-res.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    const streamAfterHigh = cc.activeStream;

    // Fall back to low.
    cc.releaseHighRes();
    const streamAfterFallback = cc.activeStream;

    // All three references must be the exact same object (no srcObject flash).
    expect(streamAfterLow).toBe(streamAfterHigh);
    expect(streamAfterHigh).toBe(streamAfterFallback);
  });

  // ── 8. High-res failure auto-fallback ──────────────────────────────

  it('when high-res fails, automatically falls back to low', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Set up low track.
    const lowMock = makeMockStream('low');
    lowPcw.simulateTrack(lowMock.track, [lowMock.stream]);

    // Connect high-res with track.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    const trackListener = vi.fn();
    cc.on('track', trackListener);

    // Simulate high-res failure.
    highPcw.simulateStateChange(PeerState.failed);

    expect(cc.isHighRes).toBe(false);
    expect(highPcw.disposed).toBe(true);
    expect(cc.activeStream).not.toBeNull();
    expect(cc.activeStream!.getVideoTracks()).toContain(lowMock.track);

    // Low-res track re-emitted.
    expect(trackListener).toHaveBeenCalledOnce();
  });

  // ── 9. updatePosition / live↔archive boundary ──────────────────────

  it('updatePosition() triggers a reconnect on the live→archive boundary', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    // Default config — currentPosition starts at 0 (live).

    cc.updatePosition(5000);

    // Crossing live→archive forces a fresh signaling handshake because the
    // server bakes positionMs into the SDP at handshake time. No DC seek.
    expect(lowPcw.sendSeek).not.toHaveBeenCalled();
    expect(lowPcw.disposed).toBe(true);
    expect(cc.state).toBe(PeerState.connecting);

    // A new PCW is created for the archive reconnect.
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('updatePosition() triggers a reconnect on the archive→live boundary', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000, // start in archive mode
    });

    cc.updatePosition(0); // back to live

    expect(lowPcw.sendSeek).not.toHaveBeenCalled();
    expect(lowPcw.disposed).toBe(true);
    expect(cc.state).toBe(PeerState.connecting);

    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('updatePosition() archive→archive uses the DC sendSeek fast path (no reconnect)', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000, // start in archive mode (no live↔archive flip on first seek)
    });

    cc.updatePosition(6000);

    // Still archive — DC seek, no reconnect.
    expect(lowPcw.sendSeek).toHaveBeenCalledWith(6000);
    expect(lowPcw.disposed).toBe(false);
    expect(mockState.instances).toHaveLength(1);
    expect(cc.state).toBe(PeerState.connected);
  });

  it('initialPosition seeds tracking — matching first updatePosition does not spuriously reconnect', async () => {
    // StreamManager passes its `_currentPosition` as `initialPosition`. If the
    // first updatePosition call from StreamManager echoes that seed, we must
    // not interpret it as a boundary flip.
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });

    cc.updatePosition(5000);

    expect(lowPcw.disposed).toBe(false);
    expect(mockState.instances).toHaveLength(1);
    expect(cc.state).toBe(PeerState.connected);
  });

  // ── 10. updateSpeed live↔archive behavior ──────────────────────────

  it('updateSpeed() in live mode stores the value but does not reconnect', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    // Live mode — currentPosition=0.

    cc.updateSpeed(2);

    // Live wire is always unlimited; the new speed is stored for the next
    // archive reconnect to pick up via the URL closure.
    expect(lowPcw.disposed).toBe(false);
    expect(mockState.instances).toHaveLength(1);
    expect(cc.state).toBe(PeerState.connected);
  });

  it('updateSpeed() in archive mode triggers a reconnect', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000, // archive
    });

    cc.updateSpeed(2);

    // Server bakes speed into SDP at handshake time, so an archive speed
    // change requires a full reconnect.
    expect(lowPcw.disposed).toBe(true);
    expect(cc.state).toBe(PeerState.connecting);

    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('initialSpeed seeds tracking — matching first updateSpeed is a no-op', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
      initialSpeed: 2,
    });

    cc.updateSpeed(2);

    expect(lowPcw.disposed).toBe(false);
    expect(mockState.instances).toHaveLength(1);
    expect(cc.state).toBe(PeerState.connected);
  });

  // ── 11. qualitySnapshot delegates to QualityMonitor ────────────────

  it('qualitySnapshot() returns current QualityMonitor snapshot', async () => {
    const { cc } = await setupWithLowConnected();

    const snap = cc.qualitySnapshot();

    expect(snap).toEqual({ mos: 5, focus: 0, stalled: false });
  });

  // ── 12. Dispose cleans up everything ───────────────────────────────

  it('dispose cleans up all connections and quality monitor', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Start high-res.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    await cc.dispose();

    expect(cc.disposed).toBe(true);
    expect(lowPcw.disposed).toBe(true);
    expect(highPcw.disposed).toBe(true);
    expect(cc.qualityMonitor.disposed).toBe(true);
  });

  // ── 13. Retries low-res connection on initial failure ──────────────

  it('retries low-res connection on failure (via withRetry)', async () => {
    const cc = new CameraConnection(TEST_CONFIG);
    // Flush microtasks to let the async signalingUrl resolve.
    await vi.advanceTimersByTimeAsync(0);
    const firstPcw = getMock(0);

    // Simulate first attempt failing.
    firstPcw.simulateStateChange(PeerState.failed);

    // Advance timer to let the retry backoff complete (max 1s for first attempt).
    await vi.advanceTimersByTimeAsync(1_500);

    // A second MockPCW should have been created for the retry.
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
    const secondPcw = getMock(1);

    // Simulate second attempt succeeding.
    secondPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    expect(cc.state).toBe(PeerState.connected);
  });

  // ── 14. Only allows requestHighRes when PRIMARY is available ───────

  it('only allows requestHighRes when PRIMARY is in availableStreams', async () => {
    const configNoHigh: CameraConnectionConfig = {
      ...TEST_CONFIG,
      availableStreams: [AvailableStreams.SECONDARY], // no PRIMARY
    };

    const { cc } = await setupWithLowConnected(configNoHigh);

    cc.requestHighRes();

    // No high-res PCW should have been created.
    expect(mockState.instances).toHaveLength(1);
    expect(cc.isHighRes).toBe(false);
  });

  // ── 15. Retries on established low-res connection failure ──────────

  it('retries low-res when an established connection later fails', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    expect(cc.state).toBe(PeerState.connected);

    // Simulate the established low connection dropping.
    lowPcw.simulateStateChange(PeerState.failed);

    // handleLowFailure -> disposeLowInternal -> connectLow -> createConnection
    // The new PCW is created after the async signalingUrl resolves.
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);

    const newLowPcw = getMock(1);
    newLowPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    expect(cc.state).toBe(PeerState.connected);
    expect(lowPcw.disposed).toBe(true);
  });

  // ── 16. Statechange events are forwarded ───────────────────────────

  it('emits statechange event when low-res connects', async () => {
    const cc = new CameraConnection(TEST_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    const lowPcw = getMock(0);

    const listener = vi.fn();
    cc.on('statechange', listener);

    lowPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    expect(listener).toHaveBeenCalledWith({
      state: PeerState.connected,
      previousState: PeerState.connecting,
    });
    expect(cc.state).toBe(PeerState.connected);
  });

  // ── 17. Disposal cascades from parent signal ───────────────────────

  it('disposes when parent signal aborts', async () => {
    const parentAc = new AbortController();
    const cc = new CameraConnection({
      ...TEST_CONFIG,
      parentSignal: parentAc.signal,
    });
    await vi.advanceTimersByTimeAsync(0);

    const lowPcw = getMock(0);
    lowPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    parentAc.abort();
    await vi.advanceTimersByTimeAsync(0);

    expect(cc.disposed).toBe(true);
    expect(lowPcw.disposed).toBe(true);
  });

  // ── 18. Low-res events suppressed when high-res is active ──────────

  it('does not forward low-res events when high-res is active', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Connect and activate high-res.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);

    expect(cc.isHighRes).toBe(true);

    const tsListener = vi.fn();
    const bufferListener = vi.fn();
    cc.on('timestamp', tsListener);
    cc.on('buffer', bufferListener);

    // Low-res events should be suppressed.
    lowPcw.simulateTimestamp({ timestamp: 42, rtpTimestamp: 10 });
    lowPcw.simulateBuffer(new ArrayBuffer(8));

    expect(tsListener).not.toHaveBeenCalled();
    expect(bufferListener).not.toHaveBeenCalled();

    // High-res events should still forward.
    highPcw.simulateTimestamp({ timestamp: 99, rtpTimestamp: 20 });
    expect(tsListener).toHaveBeenCalledWith({
      timestamp: 99,
      rtpTimestamp: 20,
    });
  });

  // ── 19. setVideoElement delegates to QualityMonitor ────────────────

  it('setVideoElement() passes element to QualityMonitor', async () => {
    const { cc } = await setupWithLowConnected();
    const el = document.createElement('video');

    const spy = vi.spyOn(cc.qualityMonitor, 'setVideoElement');
    cc.setVideoElement(el);

    expect(spy).toHaveBeenCalledWith(el);
  });

  // ── 20. High-res failure during connect (never got track) ──────────

  it('high-res failure during connect falls back silently (no state flicker)', async () => {
    const { cc } = await setupWithLowConnected();
    expect(cc.state).toBe(PeerState.connected);

    const stateListener = vi.fn();
    cc.on('statechange', stateListener);

    // Request high-res — PCW connects but fails before track arrives.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    // Fail before any track is sent.
    highPcw.simulateStateChange(PeerState.failed);

    // The state should remain 'connected' (from low-res) — no flicker.
    expect(cc.state).toBe(PeerState.connected);
    expect(cc.isHighRes).toBe(false);
    // No statechange events should have been emitted for the silent fallback.
    expect(stateListener).not.toHaveBeenCalled();
  });

  // ── 21. requestHighRes is idempotent while connecting ──────────────

  it('requestHighRes is a no-op while already connecting', async () => {
    const { cc } = await setupWithLowConnected();

    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances).toHaveLength(2);

    // Second call while first is still connecting — should not create another.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances).toHaveLength(2);
  });

  // ── 22. updateSpeed in archive mode tears down both base and upgrade ─

  it('updateSpeed() in archive mode reconnects both base and upgrade when high-res is active', async () => {
    // Start in archive mode so updateSpeed actually triggers a reconnect.
    const { cc } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });
    const lowPcw = getMock(0);

    // Activate high-res.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    cc.updateSpeed('unlimited');

    // Both connections are torn down so each comes back up with the new
    // speed baked into its SDP at handshake time.
    expect(lowPcw.disposed).toBe(true);
    expect(highPcw.disposed).toBe(true);
    expect(cc.isHighRes).toBe(false);
    expect(cc.state).toBe(PeerState.connecting);
  });

  // ── 23. MSE fallback: transcoding signal triggers reconnect ──────────

  it('transcoding signal triggers MSE reconnect when MSE is supported', async () => {
    const cc = new CameraConnection(TEST_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    const firstPcw = getMock(0);

    // Connect base.
    firstPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    expect(cc.state).toBe(PeerState.connected);

    const mseFallbackListener = vi.fn();
    cc.on('msefallback', mseFallbackListener);

    // Server signals transcoding — no codec check needed, the server's
    // signal is the definitive indicator.
    firstPcw.simulateTranscoding({ video: true });

    // Should emit msefallback and reconnect.
    expect(mseFallbackListener).toHaveBeenCalledOnce();
    expect(firstPcw.disposed).toBe(true);
    expect(cc.state).toBe(PeerState.connecting);

    // A new PCW should be created for the MSE connection.
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  // ── 24. MSE fallback: needsMse=true starts with MSE delivery ────────

  it('needsMse=true starts with MSE delivery method in signaling URL', async () => {
    const signalingUrlSpy = vi.fn().mockReturnValue('wss://example.com/webrtc');
    const config: CameraConnectionConfig = {
      ...TEST_CONFIG,
      signalingUrl: signalingUrlSpy,
      needsMse: true,
    };

    new CameraConnection(config);
    await vi.advanceTimersByTimeAsync(0);

    // signalingUrl should be called with 'mse' as delivery method.
    // MSE delivers native quality, so base switches to PRIMARY.
    expect(signalingUrlSpy).toHaveBeenCalledWith(
      AvailableStreams.PRIMARY,
      'mse',
      true,
    );
  });

  // ── 25. MSE fallback: requestHighRes is no-op in MSE mode ──────────

  it('requestHighRes() is a no-op when in MSE delivery mode', async () => {
    const config: CameraConnectionConfig = {
      ...TEST_CONFIG,
      needsMse: true,
    };

    const cc = new CameraConnection(config);
    await vi.advanceTimersByTimeAsync(0);
    const basePcw = getMock(0);
    basePcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);

    // No upgrade PCW should be created.
    expect(mockState.instances).toHaveLength(1);
  });

  // ── 26. MSE fallback: MseRenderer receives buffer data ──────────────

  it('MseRenderer receives buffer data and emits track', async () => {
    const config: CameraConnectionConfig = {
      ...TEST_CONFIG,
      needsMse: true,
    };

    const cc = new CameraConnection(config);
    await vi.advanceTimersByTimeAsync(0);
    const basePcw = getMock(0);

    // Connect and simulate delivery method.
    basePcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    basePcw.simulateDeliveryMethod({ method: 'mse', mime: 'video/mp4; codecs="hev1"' });

    // MseRenderer should have been created.
    expect(mockMseState.instances).toHaveLength(1);
    const mseRenderer = mockMseState.instances[0];

    // Buffer data should be forwarded to MseRenderer.
    const data = new ArrayBuffer(16);
    basePcw.simulateBuffer(data);
    expect(mseRenderer.appendBuffer).toHaveBeenCalledWith(data);

    // When MseRenderer emits a stream, CameraConnection should emit a track.
    const trackListener = vi.fn();
    cc.on('track', trackListener);

    const { track, stream } = makeMockStream('mse');
    mseRenderer.simulateStream(stream);

    expect(trackListener).toHaveBeenCalledOnce();
    expect(cc.activeStream).not.toBeNull();
    expect(cc.activeStream!.getVideoTracks()).toContain(track);
  });

  // ── 27. MSE fallback: no fallback when transcoding.video is false ───

  it('transcoding signal with video:false does NOT trigger MSE fallback', async () => {
    const cc = new CameraConnection(TEST_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    const basePcw = getMock(0);
    basePcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    const mseFallbackListener = vi.fn();
    cc.on('msefallback', mseFallbackListener);

    // Server signals transcoding but video is NOT being transcoded.
    basePcw.simulateTranscoding({ video: false, audio: true });

    expect(mseFallbackListener).not.toHaveBeenCalled();
    expect(basePcw.disposed).toBe(false);
    expect(cc.state).toBe(PeerState.connected);
  });

  // ── 28. MSE fallback: no fallback when MSE is not supported ────────

  it('transcoding signal does NOT trigger MSE fallback when MSE is unsupported', async () => {
    mockIsMseSupported.mockReturnValue(false);

    const cc = new CameraConnection(TEST_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    const basePcw = getMock(0);
    basePcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    const mseFallbackListener = vi.fn();
    cc.on('msefallback', mseFallbackListener);

    basePcw.simulateTranscoding({ video: true });

    expect(mseFallbackListener).not.toHaveBeenCalled();
    expect(basePcw.disposed).toBe(false);
  });

  // ── 29. MseRenderer cleanup on dispose ──────────────────────────────

  it('MseRenderer is disposed when CameraConnection is disposed', async () => {
    const config: CameraConnectionConfig = {
      ...TEST_CONFIG,
      needsMse: true,
    };

    const cc = new CameraConnection(config);
    await vi.advanceTimersByTimeAsync(0);
    const basePcw = getMock(0);
    basePcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    basePcw.simulateDeliveryMethod({ method: 'mse', mime: 'video/mp4; codecs="hev1"' });
    expect(mockMseState.instances).toHaveLength(1);
    const mseRenderer = mockMseState.instances[0];

    await cc.dispose();

    expect(mseRenderer.dispose).toHaveBeenCalled();
  });

  // ── 30. MSE fallback: replays stored transcoding from before setBasePc ─

  it('replays stored transcoding detail when PCW connected after signaling', async () => {
    const cc = new CameraConnection(TEST_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    const basePcw = getMock(0);

    // Simulate the real-world timing: transcoding is stored on the PCW
    // during signaling (before ICE connects), but the event was already
    // emitted before setBasePc registers its listener.
    basePcw.setStoredTranscoding({ video: true, audio: false });

    const mseFallbackListener = vi.fn();
    cc.on('msefallback', mseFallbackListener);

    // NOW connect — setBasePc will replay the stored transcoding detail.
    basePcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    expect(mseFallbackListener).toHaveBeenCalledOnce();
    expect(basePcw.disposed).toBe(true);
    expect(cc.state).toBe(PeerState.connecting);

    // A new PCW should be created for the MSE reconnect.
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  // ── 31. MSE fallback: needsMse + LOW target respects SECONDARY ──────

  it('needsMse=true with LOW target keeps SECONDARY base stream', async () => {
    const signalingUrlSpy = vi.fn().mockReturnValue('wss://example.com/webrtc');
    const config: CameraConnectionConfig = {
      ...TEST_CONFIG,
      signalingUrl: signalingUrlSpy,
      needsMse: true,
      targetStream: TargetStream.LOW,
    };

    new CameraConnection(config);
    await vi.advanceTimersByTimeAsync(0);

    // LOW target should keep SECONDARY even in MSE mode.
    expect(signalingUrlSpy).toHaveBeenCalledWith(
      AvailableStreams.SECONDARY,
      'mse',
      true,
    );
  });

  // ── 33. sendPause/sendResume broadcast to BOTH base and upgrade PCs ──

  it('sendPause forwards to both base and upgrade PCs while upgrade is active', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Activate upgrade with a real track so it becomes the active PC.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    cc.sendPause();

    // Both PCs must receive pause — pause/resume during a quality swap window
    // would otherwise leave one half running.
    expect(lowPcw.sendPause).toHaveBeenCalledOnce();
    expect(highPcw.sendPause).toHaveBeenCalledOnce();
  });

  it('sendResume forwards to both base and upgrade PCs while upgrade is active', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);

    cc.sendPause();
    lowPcw.sendPause.mockClear();
    highPcw.sendPause.mockClear();

    cc.sendResume();

    expect(lowPcw.sendResume).toHaveBeenCalledOnce();
    expect(highPcw.sendResume).toHaveBeenCalledOnce();
  });

  it('sendNextFrame forwards cameraId to both base and upgrade PCs', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);

    cc.sendNextFrame();

    // cameraId is the second segment of the connection key (sys1:cam1 → cam1).
    expect(lowPcw.sendNextFrame).toHaveBeenCalledWith('cam1');
    expect(highPcw.sendNextFrame).toHaveBeenCalledWith('cam1');
  });

  // ── 34. _isPaused tracks user intent regardless of PC acceptance ─────

  it('sendPause flips _isPaused even when no PC accepts the command (DC not yet open)', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    // Simulate the DC not being open yet — sendPause returns false from the wrapper.
    lowPcw.sendPause.mockReturnValue(false);

    expect(cc.sendPause()).toBe(false);
    // _isPaused MUST track user intent; otherwise dcopen-resync on the next
    // PC won't know to replay pause, and pause-survives-reconnect breaks.
    expect(cc.isPaused).toBe(true);
  });

  it('sendResume flips _isPaused back even when no PC accepts the command', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    cc.sendPause();
    expect(cc.isPaused).toBe(true);

    lowPcw.sendResume.mockReturnValue(false);
    expect(cc.sendResume()).toBe(false);
    expect(cc.isPaused).toBe(false);
  });

  // ── 35. dcopen-resync replays paused state and position on a fresh PC ─

  it('dcopen on the initial base PCW replays pause and seeks to current archive position when paused-before-connect', async () => {
    // Scenario: connection added during global pause. StreamManager calls
    // sendPause() on the connection BEFORE the first PCW finishes connecting.
    const cc = new CameraConnection({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });
    cc.sendPause();
    await vi.advanceTimersByTimeAsync(0);

    const pcw = getMock(0);
    pcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    pcw.simulateDcOpen();

    expect(pcw.sendPause).toHaveBeenCalled();
    expect(pcw.sendSeek).toHaveBeenCalledWith(5000);
  });

  it('rebuild on resume creates a fresh PC after a pause-induced base failure', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });

    cc.sendPause();

    // Server tears down media after pause. handleBaseFailure must defer.
    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBe(1);

    cc.sendResume();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockState.instances.length).toBe(2);
    const newPcw = getMock(1);
    newPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    newPcw.simulateDcOpen();

    // _isPaused is false after resume, so resync must NOT replay pause.
    // Position is baked into signalingUrl on reconnect, so dcopen-resync
    // also skips seek when no fresh server timestamp has been observed.
    expect(newPcw.sendPause).not.toHaveBeenCalled();
    expect(newPcw.sendSeek).not.toHaveBeenCalled();
  });

  it('rebuild on resume seeks to latestServerTimestampMs when one was observed before pause', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });

    // Server emits a fresher live frame timestamp before pause.
    lowPcw.simulateTimestamp({ timestampMs: 7777, rtpTimestamp: 0 });

    cc.sendPause();

    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);

    cc.sendResume();
    await vi.advanceTimersByTimeAsync(0);
    const newPcw = getMock(1);
    newPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    newPcw.simulateDcOpen();

    // Use the most recent server timestamp, not the stale config seed.
    expect(newPcw.sendSeek).toHaveBeenCalledWith(7777);
  });

  it('base failure during pause defers rebuild — no new PCW until resume', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    cc.sendPause();

    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);

    // Reconnect must be deferred while paused.
    expect(mockState.instances.length).toBe(1);
  });

  it('base track ended during pause defers rebuild — no new PCW until resume', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    cc.sendPause();

    const { track, stream } = makeMockStream('low');
    lowPcw.simulateTrack(track, [stream]);
    (track as unknown as EventTarget).dispatchEvent(new Event('ended'));
    await vi.advanceTimersByTimeAsync(0);

    expect(mockState.instances.length).toBe(1);
  });

  it('upgrade failure during pause defers rebuild — no fallback-to-base reconnect storm', async () => {
    const { cc } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    cc.sendPause();
    const instancesBefore = mockState.instances.length;

    highPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);

    // No fallback / new PC creation during pause.
    expect(mockState.instances.length).toBe(instancesBefore);
  });

  it('post-resume rebuild failure uses the short rearm cooldown, not the full 30s', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    let signalingShouldFail = false;
    const config = {
      ...TEST_CONFIG,
      // Reject with a non-retryable error so withRetry exhausts on the first attempt.
      signalingUrl: (stream: AvailableStreams) =>
        signalingShouldFail
          ? Promise.reject(ConnectionError.authorization)
          : `wss://example.com/webrtc?stream=${stream}`,
    };
    const { cc, lowPcw } = await setupWithLowConnected(config);

    // Pause → simulate failure → defer rebuild via the _isPaused branch.
    cc.sendPause();
    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);

    signalingShouldFail = true;
    setTimeoutSpy.mockClear();

    cc.sendResume();
    // One rejection is enough — non-retryable error exhausts withRetry instantly.
    await vi.advanceTimersByTimeAsync(0);

    // Verify scheduleBaseRearm used the post-resume short cooldown (3s),
    // not the long 30s default.
    const rearmDelays = setTimeoutSpy.mock.calls
      .map((c) => c[1])
      .filter((d): d is number => d === 3_000 || d === 30_000);
    expect(rearmDelays).toContain(3_000);
    expect(rearmDelays).not.toContain(30_000);
  });

  it('dcopen-resync skips both pause and seek when at live and not paused', async () => {
    // Live (currentPosition=0), not paused. resyncPausedState must early-return.
    const { lowPcw } = await setupWithLowConnected();

    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);
    const newPcw = getMock(mockState.instances.length - 1);
    newPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    newPcw.simulateDcOpen();

    expect(newPcw.sendPause).not.toHaveBeenCalled();
    expect(newPcw.sendSeek).not.toHaveBeenCalled();
  });

  it('upgrade PC also resyncs paused state when its DC opens', async () => {
    // Archive playback + paused, then activate upgrade — upgrade dcopen must resync.
    const { cc } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });
    cc.sendPause();

    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    highPcw.simulateDcOpen();

    expect(highPcw.sendPause).toHaveBeenCalled();
    expect(highPcw.sendSeek).toHaveBeenCalledWith(5000);
  });

  // ── 36. track.ended triggers handleBaseFailure ──────────────────────

  it('emits handleBaseFailure when an active base track ends (server SRTP teardown)', async () => {
    const { lowPcw } = await setupWithLowConnected();

    const { track, stream } = makeMockStream('low');
    lowPcw.simulateTrack(track, [stream]);

    // Simulate VMS teardown: track ends without ICE flipping.
    (track as unknown as { readyState: string }).readyState = 'ended';
    track.dispatchEvent(new Event('ended'));
    await vi.advanceTimersByTimeAsync(0);

    // Recovery: original PCW disposed, a fresh one created.
    expect(lowPcw.disposed).toBe(true);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('detects a track that was already ended at subscription time (initial-track race)', async () => {
    // Pre-end the track BEFORE the PCW reaches connected, so the 'ended' event
    // never fires — the queueMicrotask path inside attachBaseTrackEndedListener
    // is the only thing that catches it.
    new CameraConnection(TEST_CONFIG);
    await vi.advanceTimersByTimeAsync(0);
    const firstPcw = getMock(0);

    const { track, stream } = makeMockStream('low');
    (track as unknown as { readyState: string }).readyState = 'ended';

    // Make the PCW emit a track AFTER it connects (simulating the replay path).
    // Because the track is already ended, only queueMicrotask(onEnded) recovers.
    firstPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    firstPcw.simulateTrack(track, [stream]);

    // Flush microtasks.
    await vi.advanceTimersByTimeAsync(0);

    // Recovery should have started: firstPcw disposed, a new PCW created.
    expect(firstPcw.disposed).toBe(true);
    expect(mockState.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('attached upgrade-track ending triggers fallback to base', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    const lowMock = makeMockStream('low');
    lowPcw.simulateTrack(lowMock.track, [lowMock.stream]);

    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    // Server tears down the upgrade track.
    (highMock.track as unknown as { readyState: string }).readyState = 'ended';
    highMock.track.dispatchEvent(new Event('ended'));
    await vi.advanceTimersByTimeAsync(0);

    expect(highPcw.disposed).toBe(true);
    expect(cc.isHighRes).toBe(false);
  });

  // ── 37. lostConnection placeholder suppression ──────────────────────

  it('does not emit lostConnection while upgrade PC has a live track', async () => {
    // Use a tight retry config so we can exhaust quickly.
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      lowResRetry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 },
    });

    // Activate upgrade with a real live track.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    const errListener = vi.fn();
    cc.on('error', errListener);

    // Permanently kill base. With maxAttempts=1, exhaustion fires after one fail.
    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);
    // After handleBaseFailure → connectBase, a new PCW is created. Fail it too.
    const retryPcw = getMock(2);
    retryPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(50);

    // Suppression must hold: upgrade is still rendering live frames.
    expect(errListener).not.toHaveBeenCalled();
  });

  it('emits lostConnection when base fails and upgrade is not live', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      lowResRetry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 },
    });

    const errListener = vi.fn();
    cc.on('error', errListener);

    // Base permanently fails; no upgrade present.
    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);
    const retryPcw = getMock(mockState.instances.length - 1);
    retryPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(50);

    expect(errListener).toHaveBeenCalledWith(ConnectionError.lostConnection);
  });

  // ── 38. releaseHighRes proactive base rebuild ───────────────────────

  it('releaseHighRes rebuilds base when no live base track exists and no retry is in flight', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      lowResRetry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 },
    });

    // Activate upgrade with a real live track (so isHighRes=true).
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    // Permanently kill the base behind the upgrade so baseMediaStream stays empty
    // (no live track) and baseRetryAc settles to null after exhaustion.
    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);
    const retryPcw = getMock(2);
    retryPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(50);

    const instancesBeforeRelease = mockState.instances.length;

    cc.releaseHighRes();
    // releaseHighRes calls connectBase synchronously when no live base is present
    // and no retry is in flight, so the new PCW is created in a microtask.
    await vi.advanceTimersByTimeAsync(0);

    // Proactive rebuild: a fresh base PCW must be spun up rather than wait for
    // consumer timeout.
    expect(mockState.instances.length).toBeGreaterThan(instancesBeforeRelease);
  });

  it('releaseHighRes does not rebuild base when a base retry is already in flight', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // Activate upgrade with a real live track.
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    const highMock = makeMockStream('high');
    highPcw.simulateTrack(highMock.track, [highMock.stream]);
    expect(cc.isHighRes).toBe(true);

    // Trigger one base failure — connectBase is now retrying (baseRetryAc is set,
    // not yet exhausted because default LOW_RES_RETRY has many attempts).
    lowPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(0);
    const instancesAfterFailure = mockState.instances.length;

    cc.releaseHighRes();
    await vi.advanceTimersByTimeAsync(0);

    // No additional PCW beyond the retry already in flight — releaseHighRes
    // must not double-trigger connectBase.
    expect(mockState.instances.length).toBe(instancesAfterFailure);
  });

  // ── 39. latestServerTimestampMs cleared on playback-mode flip ───────

  it('clears latestServerTimestampMs on live→archive boundary so dcopen-resync does not seek to a stale live ts', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();
    // Live mode: server emits a wallclock timestamp.
    lowPcw.simulateTimestamp({ timestampMs: 1_700_000_000_000, rtpTimestamp: 0 });

    // Crossing live→archive: the field must be cleared so the new PCW does
    // not seek to a wallclock value when the user wants an archive position.
    cc.updatePosition(5000);
    await vi.advanceTimersByTimeAsync(0);
    const newPcw = getMock(mockState.instances.length - 1);
    newPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    // Not paused, latestServerTimestampMs should be undefined → no sendSeek.
    newPcw.simulateDcOpen();
    expect(newPcw.sendSeek).not.toHaveBeenCalled();
  });

  it('clears latestServerTimestampMs on archive→live boundary too', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });
    lowPcw.simulateTimestamp({ timestampMs: 5500, rtpTimestamp: 0 });

    cc.updatePosition(0); // archive→live
    await vi.advanceTimersByTimeAsync(0);
    const newPcw = getMock(mockState.instances.length - 1);
    newPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);

    newPcw.simulateDcOpen();
    // Live + not paused: resyncPausedState early-returns on !currentPosition.
    expect(newPcw.sendSeek).not.toHaveBeenCalled();
  });

  it('clears latestServerTimestampMs on archive→archive seek so user intent wins on resync', async () => {
    const { cc, lowPcw } = await setupWithLowConnected({
      ...TEST_CONFIG,
      initialPosition: 5000,
    });
    lowPcw.simulateTimestamp({ timestampMs: 7777, rtpTimestamp: 0 });

    // Pause so dcopen-resync will replay sendSeek against the new PCW.
    cc.sendPause();

    // archive→archive: DC sendSeek fast path; user's seek must override the
    // cached server timestamp so the next dcopen-resync lands on user intent.
    cc.updatePosition(8000);
    expect(lowPcw.sendSeek).toHaveBeenCalledWith(8000);
    lowPcw.sendSeek.mockClear();

    // Bring up an upgrade PCW; its dcopen-resync should use the new
    // currentPosition (8000), not the stale latestServerTimestampMs (7777).
    cc.requestHighRes();
    await vi.advanceTimersByTimeAsync(0);
    const highPcw = getMock(mockState.instances.length - 1);
    highPcw.simulateStateChange(PeerState.connected);
    await vi.advanceTimersByTimeAsync(0);
    highPcw.simulateDcOpen();

    expect(highPcw.sendSeek).toHaveBeenCalledWith(8000);
    expect(highPcw.sendSeek).not.toHaveBeenCalledWith(7777);
  });

  // ── 40. Circuit-breaker rearm dispose-cancellation ──────────────────

  it('disposing during a scheduled rearm cancels the timer (no zombie reconnects)', async () => {
    // Tight retry budget so connectBase exhausts on a single failure → schedules rearm.
    const cc = new CameraConnection({
      ...TEST_CONFIG,
      lowResRetry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 },
    });
    await vi.advanceTimersByTimeAsync(0);
    const firstPcw = getMock(0);
    firstPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(50);
    // connectBase has now exhausted; rearm timer should be queued for ~30s.

    const instancesAtRearmTime = mockState.instances.length;

    await cc.dispose();

    // Advance well past the rearm cooldown — no new PCW must be created.
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockState.instances.length).toBe(instancesAtRearmTime);
  });

  // ── 41. pollQuality stats collection ────────────────────────────────

  describe('pollQuality stats collection', () => {
    it('feeds RTCStats into qualityMonitor.updateStats()', async () => {
      const { cc, lowPcw } = await setupWithLowConnected();
      const updateStatsSpy = vi.spyOn(cc.qualityMonitor, 'updateStats');

      // Mock the active PC's getStats to return realistic stats
      const fakeStats = new Map();
      fakeStats.set('inbound-video', {
        type: 'inbound-rtp',
        kind: 'video',
        bytesReceived: 50000,
        jitter: 0.015,
        packetsLost: 5,
        packetsReceived: 1000,
      });
      fakeStats.set('candidate-pair-1', {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.045,
      });

      lowPcw.getStats.mockResolvedValue(fakeStats);

      // Trigger pollQuality
      await (cc as any).pollQuality();

      expect(updateStatsSpy).toHaveBeenCalledWith({
        rtt: 0.045,
        jitter: 0.015,
        packetsLost: 5,
        packetsReceived: 1000,
        bytesReceived: 50000,
      });
    });
  });

  // ── 42. reconnect() only fires when the PC is in a connected state ──

  it('reconnect() is a no-op while connecting', async () => {
    const { cc, lowPcw } = await setupWithLowConnected();

    // connected → reconnect() takes effect: dispose + rebuild.
    cc.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(lowPcw.disposed).toBe(true);
    expect(cc.state).toBe(PeerState.connecting);
    expect(mockState.instances).toHaveLength(2);

    // connecting → no-op: tearing down the in-flight rebuild is the storm bug.
    cc.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances).toHaveLength(2);
  });

  it('reconnect() is a no-op while failed', async () => {
    // Tight retry budget so a single failure exhausts withRetry → state = failed.
    const cc = new CameraConnection({
      ...TEST_CONFIG,
      lowResRetry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 },
    });
    await vi.advanceTimersByTimeAsync(0);
    const firstPcw = getMock(0);
    firstPcw.simulateStateChange(PeerState.failed);
    await vi.advanceTimersByTimeAsync(50);
    expect(cc.state).toBe(PeerState.failed);

    // failed → no-op: a rebuild here would short-circuit the scheduled rearm cooldown.
    const instancesAtFailure = mockState.instances.length;
    cc.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockState.instances.length).toBe(instancesAtFailure);
  });
});
