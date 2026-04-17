// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PeerConnectionWrapper,
  type PeerConnectionConfig,
} from '../../src/core/peer-connection';
import { PeerState } from '../../src/types';

// ─── Mock WebSocket ─────────────────────────────────────────────────────────
// jsdom does not ship a real WebSocket, so we provide a minimal mock that
// mirrors the subset of the API that SignalingChannel relies on.

class MockWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  sent: string[] = [];

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  send = vi.fn((data: string) => {
    this.sent.push(data);
  });

  constructor(public url: string) {
    super();
  }

  simulateMessage(data: unknown): void {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(data) }),
    );
  }
}

// ─── Mock RTCDataChannel ────────────────────────────────────────────────────

class MockDataChannel extends EventTarget {
  readyState = 'open';
  binaryType = 'blob';
  sent: string[] = [];

  send = vi.fn((data: string) => {
    this.sent.push(data);
  });

  close = vi.fn(() => {
    this.readyState = 'closed';
  });

  /** Simulate receiving a message (string or ArrayBuffer). */
  simulateMessage(data: string | ArrayBuffer): void {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

// ─── Mock RTCPeerConnection ─────────────────────────────────────────────────

class MockRTCPeerConnection extends EventTarget {
  iceConnectionState: RTCIceConnectionState = 'new';
  signalingState: RTCSignalingState = 'stable';
  localDescription: RTCSessionDescription | null = null;

  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;

  /** Captured config from constructor. */
  config?: RTCConfiguration;

  setRemoteDescription = vi.fn(async (_desc: RTCSessionDescriptionInit) => {
    /* no-op */
  });

  createAnswer = vi.fn(
    async (): Promise<RTCSessionDescriptionInit> => ({
      type: 'answer',
      sdp: 'v=0\r\n',
    }),
  );

  setLocalDescription = vi.fn(
    async (desc: RTCSessionDescriptionInit) => {
      this.localDescription = desc as unknown as RTCSessionDescription;
    },
  );

  addIceCandidate = vi.fn(async (_candidate: RTCIceCandidateInit) => {
    /* no-op */
  });

  getSenders = vi.fn((): RTCRtpSender[] => []);

  getStats = vi.fn().mockResolvedValue(new Map());

  close = vi.fn(() => {
    this.signalingState = 'closed';
  });

  constructor(config?: RTCConfiguration) {
    super();
    this.config = config;
  }

  // ── Simulation helpers ──────────────────────────────────────────────────

  simulateIceStateChange(state: RTCIceConnectionState): void {
    this.iceConnectionState = state;
    this.oniceconnectionstatechange?.();
  }

  simulateTrack(track: MediaStreamTrack, streams: MediaStream[]): void {
    this.ontrack?.({ track, streams } as unknown as RTCTrackEvent);
  }

  simulateDataChannel(channel: MockDataChannel): void {
    this.ondatachannel?.({
      channel,
    } as unknown as RTCDataChannelEvent);
  }

  simulateIceCandidate(candidate: RTCIceCandidate | null): void {
    this.onicecandidate?.({
      candidate,
    } as unknown as RTCPeerConnectionIceEvent);
  }
}

// ─── Test scaffolding ───────────────────────────────────────────────────────

let capturedPC: MockRTCPeerConnection | undefined;
let capturedWS: MockWebSocket | undefined;

const OriginalMockPC = MockRTCPeerConnection;
const OriginalMockWS = MockWebSocket;

beforeEach(() => {
  capturedPC = undefined;
  capturedWS = undefined;

  // Capture RTCPeerConnection instances
  const CapturingPC = vi.fn(function (
    this: MockRTCPeerConnection,
    config?: RTCConfiguration,
  ) {
    const instance = new OriginalMockPC(config);
    capturedPC = instance;
    return instance;
  }) as unknown as typeof RTCPeerConnection;

  vi.stubGlobal('RTCPeerConnection', CapturingPC);

  // Capture WebSocket instances
  const CapturingWS = vi.fn(function (this: MockWebSocket, url: string) {
    const instance = new OriginalMockWS(url);
    capturedWS = instance;
    return instance;
  }) as unknown as typeof WebSocket;

  Object.defineProperty(CapturingWS, 'CONNECTING', { value: 0 });
  Object.defineProperty(CapturingWS, 'OPEN', { value: 1 });
  Object.defineProperty(CapturingWS, 'CLOSING', { value: 2 });
  Object.defineProperty(CapturingWS, 'CLOSED', { value: 3 });

  vi.stubGlobal('WebSocket', CapturingWS);
});

function getPC(): MockRTCPeerConnection {
  if (!capturedPC) throw new Error('No RTCPeerConnection instance captured');
  return capturedPC;
}

function getWS(): MockWebSocket {
  if (!capturedWS) throw new Error('No WebSocket instance captured');
  return capturedWS;
}

const TEST_CONFIG: PeerConnectionConfig = {
  signalingUrl: 'wss://example.com/webrtc',
  iceServers: [{ urls: 'stun:stun.example.com' }],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PeerConnectionWrapper', () => {
  // ── Construction ──────────────────────────────────────────────────────

  it('creates an RTCPeerConnection and SignalingChannel on construction', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);

    const pc = getPC();
    const ws = getWS();

    expect(pc).toBeDefined();
    expect(pc.config).toEqual({ iceServers: TEST_CONFIG.iceServers });
    expect(ws.url).toBe(TEST_CONFIG.signalingUrl);
    expect(wrapper.state).toBe(PeerState.connecting);
    expect(wrapper.disposed).toBe(false);
  });

  it('creates RTCPeerConnection without iceServers when none provided', () => {
    new PeerConnectionWrapper({ signalingUrl: 'wss://example.com/webrtc' });

    const pc = getPC();
    expect(pc.config).toBeUndefined();
  });

  // ── SDP negotiation ───────────────────────────────────────────────────

  it('handles incoming SDP offer — sets remote description, creates answer, sets local description, sends answer via signaling', async () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    const offer: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: 'v=0\r\noffer-sdp\r\n',
    };

    // Simulate server sending SDP offer through signaling
    ws.simulateMessage({ sdp: offer });

    // Wait for the full async SDP negotiation chain to complete.
    // The chain is: setRemoteDescription → createAnswer → setLocalDescription → send.
    // Each step is an awaited promise so we must wait for the final step.
    await vi.waitFor(() => {
      expect(pc.setLocalDescription).toHaveBeenCalledOnce();
    });

    expect(pc.setRemoteDescription).toHaveBeenCalledWith(offer);
    expect(pc.createAnswer).toHaveBeenCalledOnce();

    // Answer should have been sent back via WebSocket
    const sentMessages = ws.sent.map((s) => JSON.parse(s));
    const sdpAnswer = sentMessages.find((m) => m.sdp);
    expect(sdpAnswer).toBeDefined();
    expect(sdpAnswer.sdp.type).toBe('answer');
  });

  // ── ICE candidates ────────────────────────────────────────────────────

  it('handles incoming ICE candidate — adds to peer connection', async () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    const candidate: RTCIceCandidateInit = {
      candidate: 'candidate:1 1 udp 2122260223 192.168.1.1 12345 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    };

    ws.simulateMessage({ ice: candidate });

    await vi.waitFor(() => {
      expect(pc.addIceCandidate).toHaveBeenCalledWith(candidate);
    });
  });

  it('forwards local ICE candidates to signaling', () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    const candidate = {
      candidate: 'candidate:2 1 udp 2122260223 10.0.0.1 54321 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    } as RTCIceCandidate;

    pc.simulateIceCandidate(candidate);

    const sentMessages = ws.sent.map((s) => JSON.parse(s));
    expect(sentMessages).toContainEqual({ ice: candidate });
  });

  it('does not forward null ICE candidates (end-of-candidates signal)', () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    pc.simulateIceCandidate(null);

    expect(ws.sent).toHaveLength(0);
  });

  // ── ICE state changes → PeerState ─────────────────────────────────────

  it('emits statechange when ICE state changes to connected', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    pc.simulateIceStateChange('connected');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      state: PeerState.connected,
      previousState: PeerState.connecting,
    });
    expect(wrapper.state).toBe(PeerState.connected);
  });

  it('emits statechange with connected for completed ICE state', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    pc.simulateIceStateChange('completed');

    expect(listener).toHaveBeenCalledWith({
      state: PeerState.connected,
      previousState: PeerState.connecting,
    });
  });

  it('emits statechange with failed for failed ICE state', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    pc.simulateIceStateChange('failed');

    expect(listener).toHaveBeenCalledWith({
      state: PeerState.failed,
      previousState: PeerState.connecting,
    });
    expect(wrapper.state).toBe(PeerState.failed);
  });

  it('emits statechange with failed for disconnected ICE state', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    pc.simulateIceStateChange('disconnected');

    expect(listener).toHaveBeenCalledWith({
      state: PeerState.failed,
      previousState: PeerState.connecting,
    });
  });

  it('does not emit duplicate statechange for the same state', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    pc.simulateIceStateChange('connected');
    pc.simulateIceStateChange('connected');

    expect(listener).toHaveBeenCalledOnce();
    expect(wrapper.state).toBe(PeerState.connected);
  });

  // ── Fast-fail on signaling WebSocket errors ──────────────────────────

  it('transitions to failed when signaling WebSocket fires error before ICE connects', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    // Simulate WebSocket error (e.g., connection refused, 307)
    ws.dispatchEvent(new Event('error'));

    expect(listener).toHaveBeenCalledWith({
      state: PeerState.failed,
      previousState: PeerState.connecting,
    });
    expect(wrapper.state).toBe(PeerState.failed);
  });

  it('transitions to failed when signaling WebSocket closes before ICE connects', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    // Simulate WebSocket close (e.g., server rejected)
    ws.dispatchEvent(new Event('close'));

    expect(listener).toHaveBeenCalledWith({
      state: PeerState.failed,
      previousState: PeerState.connecting,
    });
    expect(wrapper.state).toBe(PeerState.failed);
  });

  it('ignores signaling close after ICE is already connected', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    // ICE connects first
    pc.simulateIceStateChange('connected');
    expect(wrapper.state).toBe(PeerState.connected);

    listener.mockClear();

    // Signaling close fires (normal — we dispose it after ICE connects)
    ws.dispatchEvent(new Event('close'));

    // Should NOT transition to failed
    expect(listener).not.toHaveBeenCalled();
    expect(wrapper.state).toBe(PeerState.connected);
  });

  // ── Signaling channel disposal on connect ─────────────────────────────

  it('closes signaling channel when ICE reaches connected state', async () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    pc.simulateIceStateChange('connected');

    // Allow microtask boundary for dispose() chain
    await Promise.resolve();

    expect(ws.close).toHaveBeenCalled();
  });

  // ── Track events ──────────────────────────────────────────────────────

  it('emits track event when remote track is received', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('track', listener);

    const mockTrack = { kind: 'video', id: 'video-track-1' } as MediaStreamTrack;
    const mockStream = { id: 'stream-1' } as MediaStream;

    pc.simulateTrack(mockTrack, [mockStream]);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      track: mockTrack,
      streams: [mockStream],
    });
  });

  // ── Data channel setup ────────────────────────────────────────────────

  it('sets up datachannel on datachannel event and sets binaryType', () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();

    pc.simulateDataChannel(channel);

    expect(channel.binaryType).toBe('arraybuffer');
  });

  // ── Data channel: timestamp messages ──────────────────────────────────

  it('parses timestamp messages from datachannel and emits timestamp event', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('timestamp', listener);

    const msg = { timestamp: 1000, rtpTimestamp: 500 };
    channel.simulateMessage(JSON.stringify(msg));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      timestamp: 1000,
      rtpTimestamp: 500,
    });
  });

  it('parses timestampMs variant correctly', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('timestamp', listener);

    const msg = { timestampMs: 1000000, rtpTimestamp: 500 };
    channel.simulateMessage(JSON.stringify(msg));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      timestampMs: 1000000,
      rtpTimestamp: 500,
    });
  });

  // ── Data channel: confirmation messages ───────────────────────────────

  it('parses confirmation messages and emits confirmation event', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('confirmation', listener);

    const msg = { timestamp: -1, status: 200 };
    channel.simulateMessage(JSON.stringify(msg));

    expect(listener).toHaveBeenCalledOnce();
  });

  // ── Data channel: stream change messages ──────────────────────────────

  it('parses stream change messages and emits streamchange event', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    // First request a specific stream
    wrapper.sendStreamRequest(1, 0, 1);

    const listener = vi.fn();
    wrapper.on('streamchange', listener);

    const msg = { timestamp: -1, status: 301 };
    channel.simulateMessage(JSON.stringify(msg));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ stream: 1 });
  });

  // ── Data channel: binary data ─────────────────────────────────────────

  it('handles binary datachannel data and emits buffer event', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('buffer', listener);

    const binaryData = new ArrayBuffer(16);
    channel.simulateMessage(binaryData);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(binaryData);
  });

  // ── Data channel: unparsable messages ─────────────────────────────────

  it('silently drops unparsable string messages', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const tsListener = vi.fn();
    const confirmListener = vi.fn();
    const bufferListener = vi.fn();
    wrapper.on('timestamp', tsListener);
    wrapper.on('confirmation', confirmListener);
    wrapper.on('buffer', bufferListener);

    // Send invalid JSON
    channel.simulateMessage('not valid json {{{');

    expect(tsListener).not.toHaveBeenCalled();
    expect(confirmListener).not.toHaveBeenCalled();
    expect(bufferListener).not.toHaveBeenCalled();
  });

  // ── Data channel: transcoding messages ────────────────────────────────

  it('parses transcoding messages from datachannel and emits transcoding event', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('transcoding', listener);

    const msg = { transcoding: { video: true } };
    channel.simulateMessage(JSON.stringify(msg));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ video: true, audio: undefined });
  });

  it('stores transcoding detail from datachannel for later replay', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    expect(wrapper.transcoding).toBeNull();

    channel.simulateMessage(JSON.stringify({ transcoding: { video: true, audio: false } }));

    expect(wrapper.transcoding).toEqual({ video: true, audio: false });
  });

  // ── Data channel: delivery method (mime) messages ───────────────────

  it('parses mime messages from datachannel and emits deliverymethod event', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('deliverymethod', listener);

    channel.simulateMessage(JSON.stringify({ mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      method: 'mse',
      mime: 'video/mp4; codecs="hev1.1.6.L93.B0"',
    });
  });

  it('stores delivery method detail from datachannel for later replay', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    expect(wrapper.deliveryMethod).toBeNull();

    channel.simulateMessage(JSON.stringify({ mime: 'video/mp4' }));

    expect(wrapper.deliveryMethod).toEqual({ method: 'mse', mime: 'video/mp4' });
  });

  // ── sendStreamRequest ─────────────────────────────────────────────────

  it('sendStreamRequest sends JSON over datachannel', () => {
    new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc2 = getPC();
    const channel2 = new MockDataChannel();
    pc2.simulateDataChannel(channel2);

    wrapper.sendStreamRequest(0, 5000, 1);

    expect(channel2.send).toHaveBeenCalledOnce();
    expect(JSON.parse(channel2.sent[0])).toEqual({
      stream: 0,
      position: 5000,
      speed: 1,
    });
  });

  it('sendStreamRequest handles unlimited speed', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    wrapper.sendStreamRequest(1, 0, 'unlimited');

    expect(JSON.parse(channel.sent[0])).toEqual({
      stream: 1,
      position: 0,
      speed: 'unlimited',
    });
  });

  it('sendStreamRequest does nothing when datachannel is not open', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    channel.readyState = 'connecting';
    pc.simulateDataChannel(channel);

    wrapper.sendStreamRequest(0, 0, 1);

    expect(channel.send).not.toHaveBeenCalled();
  });

  it('sendStreamRequest does nothing when no datachannel exists', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);

    // No datachannel has been received
    expect(() => wrapper.sendStreamRequest(0, 0, 1)).not.toThrow();
  });

  // ── sendSeek ──────────────────────────────────────────────────────────

  it('sendSeek sends JSON over datachannel', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    wrapper.sendSeek(12345);

    expect(channel.send).toHaveBeenCalledOnce();
    expect(JSON.parse(channel.sent[0])).toEqual({ position: 12345 });
  });

  it('sendSeek does nothing when datachannel is not open', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    channel.readyState = 'closing';
    pc.simulateDataChannel(channel);

    wrapper.sendSeek(5000);

    expect(channel.send).not.toHaveBeenCalled();
  });

  // ── Listener unsubscribe ──────────────────────────────────────────────

  it('on() returns a cleanup function that removes the listener', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    const unsubscribe = wrapper.on('timestamp', listener);

    // Fire once — should be received
    channel.simulateMessage(
      JSON.stringify({ timestamp: 100, rtpTimestamp: 50 }),
    );
    expect(listener).toHaveBeenCalledOnce();

    // Unsubscribe
    unsubscribe();

    // Fire again — should NOT be received
    channel.simulateMessage(
      JSON.stringify({ timestamp: 200, rtpTimestamp: 60 }),
    );
    expect(listener).toHaveBeenCalledOnce();
  });

  // ── Disposal ──────────────────────────────────────────────────────────

  it('dispose cleans up: closes datachannel, stops tracks, closes RTCPeerConnection', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    // Set up a datachannel
    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    // Set up mock senders with tracks
    const mockTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const mockSender = { track: mockTrack } as unknown as RTCRtpSender;
    pc.getSenders.mockReturnValue([mockSender]);

    await wrapper.dispose();

    expect(channel.close).toHaveBeenCalled();
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(pc.close).toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalled();
    expect(wrapper.disposed).toBe(true);
  });

  it('does not throw when disposing during connection (before datachannel)', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);

    expect(() => wrapper.dispose()).not.toThrow();
    expect(wrapper.disposed).toBe(true);
  });

  it('double dispose is safe', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);

    wrapper.dispose();
    expect(() => wrapper.dispose()).not.toThrow();
  });

  it('does not emit statechange events after disposal', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    await wrapper.dispose();

    pc.simulateIceStateChange('connected');

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not emit datachannel events after disposal', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();

    const channel = new MockDataChannel();
    pc.simulateDataChannel(channel);

    const listener = vi.fn();
    wrapper.on('timestamp', listener);

    await wrapper.dispose();

    channel.simulateMessage(
      JSON.stringify({ timestamp: 100, rtpTimestamp: 50 }),
    );

    expect(listener).not.toHaveBeenCalled();
  });

  // ── Parent signal disposal ────────────────────────────────────────────

  it('disposes when parent signal aborts', async () => {
    const parentAbort = new AbortController();
    const wrapper = new PeerConnectionWrapper({
      ...TEST_CONFIG,
      parentSignal: parentAbort.signal,
    });
    const pc = getPC();

    expect(wrapper.disposed).toBe(false);

    parentAbort.abort();
    // Allow microtask boundary for async dispose chain
    await Promise.resolve();

    expect(wrapper.disposed).toBe(true);
    expect(pc.close).toHaveBeenCalled();
  });

  // ── SDP failure → failed state ────────────────────────────────────────

  it('transitions to failed state when SDP negotiation fails', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    // Make SDP negotiation fail
    pc.setRemoteDescription.mockRejectedValueOnce(new Error('SDP error'));

    ws.simulateMessage({
      sdp: { type: 'offer', sdp: 'v=0\r\nbad-sdp\r\n' },
    });

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({
        state: PeerState.failed,
        previousState: PeerState.connecting,
      });
    });
  });

  // ── ICE candidate add failure (non-fatal) ────────────────────────────

  it('does not throw or change state when addIceCandidate fails', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const pc = getPC();
    const ws = getWS();

    pc.addIceCandidate.mockRejectedValueOnce(
      new Error('ICE candidate error'),
    );

    const listener = vi.fn();
    wrapper.on('statechange', listener);

    ws.simulateMessage({
      ice: {
        candidate: 'candidate:1 1 udp 2122260223 192.168.1.1 12345 typ host',
      },
    });

    // Allow async to settle
    await new Promise((r) => setTimeout(r, 10));

    // State should still be connecting — ICE failure is non-fatal
    expect(wrapper.state).toBe(PeerState.connecting);
    expect(listener).not.toHaveBeenCalled();
  });

  // ── Transcoding events ───────────────────────────────────────────────

  it('emits transcoding event when server signals video transcoding', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('transcoding', listener);

    ws.simulateMessage({ transcoding: { video: true } });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ video: true, audio: undefined });
  });

  it('emits transcoding event with audio field when present', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('transcoding', listener);

    ws.simulateMessage({ transcoding: { video: false, audio: true } });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ video: false, audio: true });
  });

  it('does not emit transcoding event after disposal', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('transcoding', listener);

    await wrapper.dispose();

    ws.simulateMessage({ transcoding: { video: true } });

    expect(listener).not.toHaveBeenCalled();
  });

  // ── Delivery method events ───────────────────────────────────────────

  it('emits deliverymethod event when server sends mime type', () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('deliverymethod', listener);

    ws.simulateMessage({ mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      method: 'mse',
      mime: 'video/mp4; codecs="hev1.1.6.L93.B0"',
    });
  });

  it('does not emit deliverymethod event after disposal', async () => {
    const wrapper = new PeerConnectionWrapper(TEST_CONFIG);
    const ws = getWS();

    const listener = vi.fn();
    wrapper.on('deliverymethod', listener);

    await wrapper.dispose();

    ws.simulateMessage({ mime: 'video/mp4' });

    expect(listener).not.toHaveBeenCalled();
  });

  // ── getStats ────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('delegates to the underlying RTCPeerConnection', async () => {
      const fakeStats = new Map();
      fakeStats.set('inbound-rtp-video', {
        type: 'inbound-rtp',
        kind: 'video',
        bytesReceived: 1000,
      });

      const pcw = new PeerConnectionWrapper(TEST_CONFIG);
      const pc = getPC();

      pc.getStats = vi.fn().mockResolvedValue(fakeStats);

      const stats = await pcw.getStats();
      expect(stats).toBe(fakeStats);

      pcw.dispose();
    });
  });
});
