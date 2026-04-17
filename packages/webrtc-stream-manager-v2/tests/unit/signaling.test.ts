// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalingChannel } from '../../src/core/signaling';

// ---------------------------------------------------------------------------
// MockWebSocket -- jsdom does not ship a real WebSocket implementation, so we
// provide a minimal mock that mirrors the subset of the WebSocket API that
// SignalingChannel relies on.
// ---------------------------------------------------------------------------
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

  // ---- Helpers for simulating server-side behaviour ----

  simulateMessage(data: unknown): void {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(data) }),
    );
  }

  simulateOpen(): void {
    this.dispatchEvent(new Event('open'));
  }

  simulateError(): void {
    this.dispatchEvent(new Event('error'));
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent('close'));
  }
}

// Replace global WebSocket with the mock
vi.stubGlobal('WebSocket', MockWebSocket);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let capturedSocket: MockWebSocket | undefined;
const OriginalMockWebSocket = MockWebSocket;

beforeEach(() => {
  capturedSocket = undefined;
  // Wrap the constructor to capture the instance
  const CapturingWebSocket = vi.fn(function (this: MockWebSocket, url: string) {
    const instance = new OriginalMockWebSocket(url);
    capturedSocket = instance;
    return instance;
  }) as unknown as typeof WebSocket;
  // Copy static constants
  Object.defineProperty(CapturingWebSocket, 'CONNECTING', { value: 0 });
  Object.defineProperty(CapturingWebSocket, 'OPEN', { value: 1 });
  Object.defineProperty(CapturingWebSocket, 'CLOSING', { value: 2 });
  Object.defineProperty(CapturingWebSocket, 'CLOSED', { value: 3 });
  vi.stubGlobal('WebSocket', CapturingWebSocket);
});

function getSocket(): MockWebSocket {
  if (!capturedSocket) throw new Error('No WebSocket instance was captured');
  return capturedSocket;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignalingChannel', () => {
  const TEST_URL = 'wss://example.com/signaling';

  it('connects to the provided URL', () => {
    new SignalingChannel(TEST_URL);
    const socket = getSocket();
    expect(socket.url).toBe(TEST_URL);
  });

  it('sends JSON-stringified messages', () => {
    const channel = new SignalingChannel(TEST_URL);
    const socket = getSocket();
    socket.simulateOpen();

    const payload = { type: 'offer', sdp: 'v=0...' };
    channel.send(payload);

    expect(socket.send).toHaveBeenCalledOnce();
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it('dispatches parsed message events', () => {
    const channel = new SignalingChannel(TEST_URL);
    const socket = getSocket();

    const listener = vi.fn();
    channel.on('message', listener);

    const serverPayload = { type: 'answer', sdp: 'v=0...' };
    socket.simulateMessage(serverPayload);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(serverPayload);
  });

  it('closes WebSocket on dispose', async () => {
    const channel = new SignalingChannel(TEST_URL);
    const socket = getSocket();

    await channel.dispose();

    expect(socket.close).toHaveBeenCalledOnce();
    expect(channel.disposed).toBe(true);
  });

  it('closes WebSocket when parent signal aborts', async () => {
    const parentAbort = new AbortController();
    const channel = new SignalingChannel(TEST_URL, parentAbort.signal);
    const socket = getSocket();

    parentAbort.abort();
    // dispose() is async -- the linkTo handler calls dispose() which awaits
    // onAfterAbort(), introducing a microtask boundary before the abort
    // controller fires.  Flush it so the onDispose cleanup (ws.close) runs.
    await Promise.resolve();

    expect(socket.close).toHaveBeenCalledOnce();
    expect(channel.disposed).toBe(true);
  });

  it('dispatches error event on WebSocket error', () => {
    const channel = new SignalingChannel(TEST_URL);
    const socket = getSocket();

    const errorListener = vi.fn();
    channel.on('error', errorListener);

    socket.simulateError();

    expect(errorListener).toHaveBeenCalledOnce();
  });

  it('dispatches close event on WebSocket close', () => {
    const channel = new SignalingChannel(TEST_URL);
    const socket = getSocket();

    const closeListener = vi.fn();
    channel.on('close', closeListener);

    socket.simulateClose();

    expect(closeListener).toHaveBeenCalledOnce();
  });

  it('does not throw when disposing an already-closed channel', async () => {
    const channel = new SignalingChannel(TEST_URL);
    await channel.dispose();
    expect(() => channel.dispose()).not.toThrow();
  });
});
