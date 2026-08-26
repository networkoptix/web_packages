// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock StreamManager & CameraConnection ──────────────────────────────────
// vi.hoisted ensures these are available inside the vi.mock factory functions.

const { mockState, MockStreamManager, MockCameraConnection } = vi.hoisted(() => {
  const mockState = {
    configureArgs: null as any,
    configureCalls: 0,
    connections: new Map<string, any>(),
    lastConnectArgs: null as any,
    positionCalls: [] as any[],
    cameraPositionCalls: [] as any[],
    speedCalls: [] as any[],
    togglePlayingCalls: 0,
    closeAllCalls: 0,
    disposed: false,
  };

  class MockCameraConnection {
    connectionKey: string;
    private _listeners = new Map<string, Array<(...args: any[]) => void>>();

    constructor(connectionKey: string) {
      this.connectionKey = connectionKey;
    }

    on(event: string, listener: (...args: any[]) => void): () => void {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      this._listeners.get(event)!.push(listener);
      return () => {
        const listeners = this._listeners.get(event);
        if (listeners) {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
        }
      };
    }

    /** Test helper: emit an event to all registered listeners. */
    _emit(event: string, detail: any): void {
      const listeners = this._listeners.get(event);
      if (listeners) {
        for (const listener of [...listeners]) {
          listener(detail);
        }
      }
    }

    /** Test helper: get count of active listeners for an event. */
    _listenerCount(event: string): number {
      return this._listeners.get(event)?.length ?? 0;
    }

    updatePosition = vi.fn();
    updateSpeed = vi.fn();
    setDataPaused = vi.fn().mockReturnValue(true);
    activeStreamIndex = 1;
    getPlayingCodec = vi.fn().mockResolvedValue('video/H265');
    setVideoElement = vi.fn();
    dispose = vi.fn().mockResolvedValue(undefined);
  }

  class MockStreamManager {
    static _instance: MockStreamManager | null = null;

    static configure(config: any): void {
      mockState.configureArgs = config;
      mockState.configureCalls++;
      MockStreamManager._instance = new MockStreamManager();
    }

    static getInstance(): MockStreamManager {
      if (!MockStreamManager._instance) {
        throw new Error('StreamManager not configured');
      }
      return MockStreamManager._instance;
    }

    static reset(): void {
      MockStreamManager._instance = null;
    }

    connect(config: any, videoElement?: HTMLVideoElement): MockCameraConnection {
      mockState.lastConnectArgs = { config, videoElement };
      const key = `${config.systemId}:${config.cameraId}`;
      let connection = mockState.connections.get(key);
      if (!connection) {
        connection = new MockCameraConnection(key);
        mockState.connections.set(key, connection);
      }
      return connection;
    }

    getConnection(key: string): MockCameraConnection | null {
      return mockState.connections.get(key) ?? null;
    }

    updatePosition(positionMs?: number): void {
      mockState.positionCalls.push(positionMs);
    }

    updateCameraPosition(cameraId: { id: string; systemId: string }, positionMs: number): void {
      mockState.cameraPositionCalls.push({ cameraId, positionMs });
    }

    togglePlaying(): void {
      mockState.togglePlayingCalls++;
    }

    updateSpeed(speed: number | 'unlimited'): void {
      mockState.speedCalls.push(speed);
    }

    async closeAll(): Promise<void> {
      mockState.closeAllCalls++;
      mockState.disposed = true;
    }
  }

  return { mockState, MockStreamManager, MockCameraConnection };
});

vi.mock('../../src/core/stream-manager', () => ({
  StreamManager: MockStreamManager,
}));

vi.mock('../../src/core/camera-connection', () => ({
  CameraConnection: MockCameraConnection,
}));

// ─── Imports (after mock setup) ─────────────────────────────────────────────

import { WebRTCStreamManager } from '../../src/facade/legacy-adapter';
import { AvailableStreams, ConnectionError, TargetStream } from '../../src/types';
import type { WebRtcUrlConfig } from '../../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetMockState(): void {
  mockState.configureArgs = null;
  mockState.configureCalls = 0;
  mockState.connections.clear();
  mockState.lastConnectArgs = null;
  mockState.positionCalls = [];
  mockState.cameraPositionCalls = [];
  mockState.speedCalls = [];
  mockState.togglePlayingCalls = 0;
  mockState.closeAllCalls = 0;
  mockState.disposed = false;
  MockStreamManager.reset();
}

/** Reset the facade's internal _configured flag by calling closeAll(). */
async function resetFacade(): Promise<void> {
  // Force the facade into a clean state.
  // We need to also reset the static config properties to defaults.
  await WebRTCStreamManager.closeAll();
  WebRTCStreamManager.logger = undefined;
  WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL = true;
  WebRTCStreamManager.RELAY_URL = '{systemId}.relay.vmsproxy.com';
  WebRTCStreamManager.maxBehind = 5;
  WebRTCStreamManager.USE_RELAY_PREFIX = false;
  WebRTCStreamManager.position = 0;
}

function makeUrlConfig(
  systemId: string,
  cameraId: string,
  overrides: Partial<WebRtcUrlConfig> = {},
): WebRtcUrlConfig {
  return {
    systemId,
    cameraId,
    accessToken: 'test-token',
    targetStream: TargetStream.AUTO,
    ...overrides,
  } as WebRtcUrlConfig;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WebRTCStreamManager (legacy facade)', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(async () => {
    await resetFacade();
    resetMockState();
  });

  // ── 1. Static config forwarding ──────────────────────────────────────

  describe('static config', () => {
    it('forwards static config properties to StreamManager.configure()', () => {
      WebRTCStreamManager.logger = console;
      WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL = false;
      WebRTCStreamManager.RELAY_URL = 'custom.relay.com';
      WebRTCStreamManager.maxBehind = 10;
      WebRTCStreamManager.USE_RELAY_PREFIX = true;

      // Trigger lazy configuration via connect().
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      WebRTCStreamManager.connect(urlConfig);

      expect(mockState.configureCalls).toBe(1);
      expect(mockState.configureArgs).toEqual({
        relayUrl: 'custom.relay.com',
        useRelayPrefix: true,
        maxBehind: 10,
        useUnreliableDataChannel: false,
        logger: console,
      });
    });

    it('does not reconfigure on subsequent connect() calls', () => {
      const urlConfig1 = makeUrlConfig('sys1', 'cam1');
      const urlConfig2 = makeUrlConfig('sys1', 'cam2');

      WebRTCStreamManager.connect(urlConfig1);
      WebRTCStreamManager.connect(urlConfig2);

      expect(mockState.configureCalls).toBe(1);
    });
  });

  // ── 2. connect() ─────────────────────────────────────────────────────

  describe('connect()', () => {
    it('returns an Observable', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const result = WebRTCStreamManager.connect(urlConfig);

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('lazily configures StreamManager on first call', () => {
      expect(mockState.configureCalls).toBe(0);

      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      expect(mockState.configureCalls).toBe(1);
    });

    it('passes videoElement to StreamManager.connect()', () => {
      const videoEl = document.createElement('video');
      const urlConfig = makeUrlConfig('sys1', 'cam1');

      WebRTCStreamManager.connect(urlConfig, videoEl);

      expect(mockState.lastConnectArgs.videoElement).toBe(videoEl);
    });

    it('merges targetStreams into the config', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const streams = [AvailableStreams.PRIMARY];

      WebRTCStreamManager.connect(urlConfig, undefined, streams);

      expect(mockState.lastConnectArgs.config.availableStreams).toEqual(streams);
    });

    it('merges accessToken into the config', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const tokenFactory = () => 'dynamic-token';

      WebRTCStreamManager.connect(urlConfig, undefined, null, tokenFactory);

      expect(mockState.lastConnectArgs.config.accessToken).toBe(tokenFactory);
    });

    it('does not override accessToken when not provided', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');

      WebRTCStreamManager.connect(urlConfig);

      expect(mockState.lastConnectArgs.config.accessToken).toBe('test-token');
    });
  });

  // ── 3. closeAll() ────────────────────────────────────────────────────

  describe('closeAll()', () => {
    it('returns Promise<true> when configured', async () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      const result = await WebRTCStreamManager.closeAll();

      expect(result).toBe(true);
      expect(mockState.closeAllCalls).toBe(1);
    });

    it('returns Promise<true> when not configured (no-op)', async () => {
      const result = await WebRTCStreamManager.closeAll();

      expect(result).toBe(true);
      expect(mockState.closeAllCalls).toBe(0);
    });

    it('resets _configured so next connect() reconfigures', async () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));
      expect(mockState.configureCalls).toBe(1);

      await WebRTCStreamManager.closeAll();
      // Reset the mock manager so a new configure() creates a fresh one.
      MockStreamManager.reset();

      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam2'));
      expect(mockState.configureCalls).toBe(2);
    });
  });

  // ── 4. getInstance() ─────────────────────────────────────────────────

  describe('getInstance()', () => {
    it('returns a WebRTCStreamManager wrapper for an existing connection', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      const instance = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' });

      expect(instance).toBeInstanceOf(WebRTCStreamManager);
      expect(instance!.cameraId).toBe('sys1:cam1');
    });

    it('returns null when not configured', () => {
      const result = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' });

      expect(result).toBeNull();
    });

    it('returns null for unknown camera', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      const result = WebRTCStreamManager.getInstance({ id: 'cam999', systemId: 'sys1' });

      expect(result).toBeNull();
    });
  });

  // ── 5. updatePosition() ──────────────────────────────────────────────

  describe('updatePosition()', () => {
    it('forwards rounded position to StreamManager', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      WebRTCStreamManager.updatePosition(5000.7);

      expect(mockState.positionCalls).toContain(5001);
    });

    it('stores position on the static property', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      WebRTCStreamManager.updatePosition(3000);

      expect(WebRTCStreamManager.position).toBe(3000);
    });

    it('passes undefined when position is 0 (live mode)', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      WebRTCStreamManager.updatePosition(0);

      expect(mockState.positionCalls).toContain(undefined);
    });

    it('defaults to 0 when called without arguments', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      WebRTCStreamManager.updatePosition();

      expect(WebRTCStreamManager.position).toBe(0);
      expect(mockState.positionCalls).toContain(undefined);
    });

    it('is a no-op when not configured', () => {
      // Should not throw.
      WebRTCStreamManager.updatePosition(5000);

      expect(mockState.positionCalls).toHaveLength(0);
    });
  });

  // ── 6. updateCameraPosition() ────────────────────────────────────────

  describe('updateCameraPosition()', () => {
    it('forwards to StreamManager.updateCameraPosition()', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));
      const camera = { id: 'cam1', systemId: 'sys1' };

      WebRTCStreamManager.updateCameraPosition(camera, 9000);

      expect(mockState.cameraPositionCalls).toEqual([
        { cameraId: camera, positionMs: 9000 },
      ]);
    });

    it('is a no-op when not configured', () => {
      WebRTCStreamManager.updateCameraPosition({ id: 'cam1', systemId: 'sys1' }, 5000);

      expect(mockState.cameraPositionCalls).toHaveLength(0);
    });
  });

  // ── 7. togglePlaying() ───────────────────────────────────────────────

  describe('togglePlaying()', () => {
    it('forwards to StreamManager.togglePlaying()', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      WebRTCStreamManager.togglePlaying();

      expect(mockState.togglePlayingCalls).toBe(1);
    });

    it('is a no-op when not configured', () => {
      WebRTCStreamManager.togglePlaying();

      expect(mockState.togglePlayingCalls).toBe(0);
    });
  });

  // ── 8. updateSpeed() ─────────────────────────────────────────────────

  describe('updateSpeed()', () => {
    it('forwards speed to StreamManager.updateSpeed()', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      WebRTCStreamManager.updateSpeed(2);

      expect(mockState.speedCalls).toEqual([2]);
    });

    it('is a no-op when not configured', () => {
      WebRTCStreamManager.updateSpeed(4);

      expect(mockState.speedCalls).toHaveLength(0);
    });
  });

  // ── 9. Instance: mediaStream$ emits on track events ──────────────────

  describe('instance mediaStream$', () => {
    it('emits [MediaStream, null, instance] on track event', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));

      // Get the mock CameraConnection and emit a track event.
      const mockConnection = mockState.connections.get('sys1:cam1')!;
      const fakeStream = { id: 'stream-1' } as unknown as MediaStream;
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [fakeStream],
      });

      expect(emissions).toHaveLength(1);
      expect(emissions[0][0]).toBe(fakeStream);
      expect(emissions[0][1]).toBeNull();
      expect(emissions[0][2]).toBeInstanceOf(WebRTCStreamManager);

      sub.unsubscribe();
    });

    it('emits [null, ConnectionError, instance] on error event', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));

      const mockConnection = mockState.connections.get('sys1:cam1')!;
      mockConnection._emit('error', ConnectionError.lostConnection);

      expect(emissions).toHaveLength(1);
      expect(emissions[0][0]).toBeNull();
      expect(emissions[0][1]).toBe(ConnectionError.lostConnection);
      expect(emissions[0][2]).toBeInstanceOf(WebRTCStreamManager);

      sub.unsubscribe();
    });

    it('emits null stream when track event has no streams', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));

      const mockConnection = mockState.connections.get('sys1:cam1')!;
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [],
      });

      expect(emissions).toHaveLength(1);
      expect(emissions[0][0]).toBeNull();

      sub.unsubscribe();
    });
  });

  // ── 10. Instance: currentPosition$ updates on timestamp events ───────

  describe('instance currentPosition$', () => {
    it('updates on timestampMs events', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      // We need to subscribe to activate the Observable pipeline.
      const sub = obs.subscribe();

      const mockConnection = mockState.connections.get('sys1:cam1')!;
      mockConnection._emit('timestamp', {
        timestampMs: 42000,
        rtpTimestamp: 123,
      });

      // The currentPosition$ is on the internal instance. Since we can't
      // directly access it from the outside without getInstance(), and
      // getInstance() creates a NEW wrapper, let's verify via the instance
      // returned by connect(). We can capture it from the emission tuple.
      const emissions: any[] = [];
      // Also subscribe to track to get the instance reference.
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [{ id: 'stream-1' } as unknown as MediaStream],
      });

      const trackSub = obs.subscribe((value) => emissions.push(value));
      // Re-emit to capture via the new subscription.
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [{ id: 'stream-1' } as unknown as MediaStream],
      });

      if (emissions.length > 0) {
        const facade = emissions[0][2] as WebRTCStreamManager;
        // Emit timestamp again with the active subscription.
        mockConnection._emit('timestamp', {
          timestampMs: 55000,
          rtpTimestamp: 456,
        });
        expect(facade.currentPosition$.getValue()).toBe(55000);
      }

      sub.unsubscribe();
      trackSub.unsubscribe();
    });

    it('converts seconds-based timestamp to milliseconds', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));

      const mockConnection = mockState.connections.get('sys1:cam1')!;

      // Emit a track first to get the instance reference.
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [{ id: 'stream-1' } as unknown as MediaStream],
      });

      expect(emissions).toHaveLength(1);
      const facade = emissions[0][2] as WebRTCStreamManager;

      // Now emit a seconds-based timestamp.
      mockConnection._emit('timestamp', {
        timestamp: 42,
        rtpTimestamp: 789,
      });

      expect(facade.currentPosition$.getValue()).toBe(42000);

      sub.unsubscribe();
    });

    it('starts at 0', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));

      const mockConnection = mockState.connections.get('sys1:cam1')!;
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [{ id: 'stream-1' } as unknown as MediaStream],
      });

      const facade = emissions[0][2] as WebRTCStreamManager;
      expect(facade.currentPosition$.getValue()).toBe(0);

      sub.unsubscribe();
    });
  });

  // ── 10b. Instance: displayedEpochMs (rVFC↔DC-pair binding) ───────────

  describe('instance displayedEpochMs()', () => {
    /** Connects + returns the facade wrapper and its mock connection. */
    function setupInstance() {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);
      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));
      const mockConnection = mockState.connections.get('sys1:cam1')!;
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [{ id: 'stream-1' } as unknown as MediaStream],
      });
      const facade = emissions[0][2] as WebRTCStreamManager;
      return { facade, mockConnection, sub };
    }

    it('returns null before any DC pair arrives', () => {
      const { facade, sub } = setupInstance();
      expect(facade.displayedEpochMs(90_000)).toBeNull();
      sub.unsubscribe();
    });

    it('interpolates forward and backward from a DC pair at 90 ticks/ms', () => {
      const { facade, mockConnection, sub } = setupInstance();
      mockConnection._emit('timestamp', { timestampMs: 1_000_000, rtpTimestamp: 900_000 });
      // +90 ticks = +1 ms; −180 ticks = −2 ms.
      expect(facade.displayedEpochMs(900_090)).toBe(1_000_001);
      expect(facade.displayedEpochMs(899_820)).toBe(999_998);
      sub.unsubscribe();
    });

    it('binds seconds-based timestamp events too', () => {
      const { facade, mockConnection, sub } = setupInstance();
      mockConnection._emit('timestamp', { timestamp: 42, rtpTimestamp: 9_000 });
      expect(facade.displayedEpochMs(9_090)).toBe(42_001);
      sub.unsubscribe();
    });

    it('uses the nearest pair, not the last (unreliable DC can reorder)', () => {
      const { facade, mockConnection, sub } = setupInstance();
      mockConnection._emit('timestamp', { timestampMs: 1_000_000, rtpTimestamp: 900_000 });
      mockConnection._emit('timestamp', { timestampMs: 1_001_000, rtpTimestamp: 990_000 });
      // 900_090 is 90 ticks from the first pair, 89_910 from the second.
      expect(facade.displayedEpochMs(900_090)).toBe(1_000_001);
      sub.unsubscribe();
    });

    it('returns null when the rtp gap exceeds the 30 s binding window', () => {
      const { facade, mockConnection, sub } = setupInstance();
      mockConnection._emit('timestamp', { timestampMs: 1_000_000, rtpTimestamp: 900_000 });
      // 31 s away in ticks.
      expect(facade.displayedEpochMs(900_000 + 31_000 * 90)).toBeNull();
      sub.unsubscribe();
    });

    it('discards pre-reset pairs when the RTP timeline restarts near 0', () => {
      const { facade, mockConnection, sub } = setupInstance();
      mockConnection._emit('timestamp', { timestampMs: 1_000_000, rtpTimestamp: 500_000_000 });
      // Reconnect: the RTP clock restarts near 0 — a huge backwards step.
      mockConnection._emit('timestamp', { timestampMs: 2_000_000, rtpTimestamp: 9_000 });
      // Pre-reset rtp no longer binds (its pair was discarded)…
      expect(facade.displayedEpochMs(500_000_090)).toBeNull();
      // …while the post-reset timeline binds against the fresh pair.
      expect(facade.displayedEpochMs(9_090)).toBe(2_000_001);
      sub.unsubscribe();
    });

    it('tolerates small backwards rtp jitter without resetting', () => {
      const { facade, mockConnection, sub } = setupInstance();
      mockConnection._emit('timestamp', { timestampMs: 1_000_000, rtpTimestamp: 900_000 });
      // 1 s backwards: reordered delivery, not a reset — both pairs usable.
      mockConnection._emit('timestamp', { timestampMs: 999_000, rtpTimestamp: 810_000 });
      expect(facade.displayedEpochMs(900_090)).toBe(1_000_001);
      expect(facade.displayedEpochMs(810_090)).toBe(999_001);
      sub.unsubscribe();
    });

    it('keeps only a bounded rolling window of pairs', () => {
      const { facade, mockConnection, sub } = setupInstance();
      // A deviant first pair: if the window cap drops it, the (consistent)
      // survivors interpolate 1_000_000 for its rtp; if not, it wins at gap 0.
      mockConnection._emit('timestamp', { timestampMs: 5_000_000, rtpTimestamp: 900_000 });
      for (let i = 1; i < 10; i++) {
        mockConnection._emit('timestamp', {
          timestampMs: 1_000_000 + i * 1_000,
          rtpTimestamp: 900_000 + i * 90_000,
        });
      }
      expect(facade.displayedEpochMs(900_000)).toBe(1_000_000);
      sub.unsubscribe();
    });
  });

  // ── 11. Instance: updateAvailableStreams is a no-op ──────────────────

  describe('instance updateAvailableStreams()', () => {
    it('is callable and does not throw', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const emissions: any[] = [];
      const sub = obs.subscribe((value) => emissions.push(value));

      const mockConnection = mockState.connections.get('sys1:cam1')!;
      mockConnection._emit('track', {
        track: {} as MediaStreamTrack,
        streams: [{ id: 'stream-1' } as unknown as MediaStream],
      });

      const facade = emissions[0][2] as WebRTCStreamManager;

      expect(() => {
        facade.updateAvailableStreams([AvailableStreams.PRIMARY, AvailableStreams.SECONDARY]);
      }).not.toThrow();

      sub.unsubscribe();
    });
  });

  // ── 12. Unsubscribe cleans up event listeners ────────────────────────

  describe('Observable teardown', () => {
    it('removes event listeners on unsubscribe', () => {
      const urlConfig = makeUrlConfig('sys1', 'cam1');
      const obs = WebRTCStreamManager.connect(urlConfig);

      const sub = obs.subscribe();

      const mockConnection = mockState.connections.get('sys1:cam1')!;

      // Should have listeners registered.
      expect(mockConnection._listenerCount('track')).toBeGreaterThan(0);
      expect(mockConnection._listenerCount('error')).toBeGreaterThan(0);
      expect(mockConnection._listenerCount('timestamp')).toBeGreaterThan(0);

      sub.unsubscribe();

      // After unsubscribe, listeners should be removed.
      expect(mockConnection._listenerCount('track')).toBe(0);
      expect(mockConnection._listenerCount('error')).toBe(0);
      expect(mockConnection._listenerCount('timestamp')).toBe(0);
    });
  });

  // ── 13. cameraId getter ──────────────────────────────────────────────

  describe('cameraId getter', () => {
    it('returns the connection key', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));

      const instance = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' })!;

      expect(instance.cameraId).toBe('sys1:cam1');
    });
  });

  // ── Playing stream identity & codec (delegation) ─────────────────────

  describe('instance currentStream() / getPlayingCodec()', () => {
    it('currentStream() returns the connection activeStreamIndex', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));
      const instance = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' })!;

      expect(instance.currentStream()).toBe(1);

      const connection = mockState.connections.get('sys1:cam1');
      connection.activeStreamIndex = 0;
      expect(instance.currentStream()).toBe(0);
    });

    it('getPlayingCodec() delegates to the connection', async () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));
      const instance = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' })!;

      await expect(instance.getPlayingCodec()).resolves.toBe('video/H265');

      const connection = mockState.connections.get('sys1:cam1');
      expect(connection.getPlayingCodec).toHaveBeenCalled();
    });
  });

  // ── Archive-gap pause (delegation) ───────────────────────────────────

  describe('instance setDataPaused()', () => {
    it('delegates to the underlying connection', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));
      const instance = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' })!;

      expect(instance.setDataPaused(true)).toBe(true);

      const connection = mockState.connections.get('sys1:cam1');
      expect(connection.setDataPaused).toHaveBeenCalledWith(true);
    });

    it('forwards the false case for resume', () => {
      WebRTCStreamManager.connect(makeUrlConfig('sys1', 'cam1'));
      const instance = WebRTCStreamManager.getInstance({ id: 'cam1', systemId: 'sys1' })!;

      instance.setDataPaused(false);

      const connection = mockState.connections.get('sys1:cam1');
      expect(connection.setDataPaused).toHaveBeenCalledWith(false);
    });
  });
});
