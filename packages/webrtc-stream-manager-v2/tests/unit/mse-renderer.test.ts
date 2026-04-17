// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock MSE APIs ──────────────────────────────────────────────────────────
// jsdom does not provide MediaSource or SourceBuffer, so we mock them.

class MockSourceBuffer extends EventTarget {
  mode = 'segments';
  updating = false;
  buffered = {
    length: 0,
    start: vi.fn(() => 0),
    end: vi.fn(() => 0),
  } as unknown as TimeRanges;

  appendBuffer = vi.fn((data: ArrayBuffer) => {
    this.updating = true;
    // Simulate async append completion via updateend event.
    queueMicrotask(() => {
      this.updating = false;
      this.dispatchEvent(new Event('updateend'));
    });
  });

  remove = vi.fn((_start: number, _end: number) => {
    this.updating = true;
    queueMicrotask(() => {
      this.updating = false;
      this.dispatchEvent(new Event('updateend'));
    });
  });
}

class MockMediaSource extends EventTarget {
  readyState: 'closed' | 'open' | 'ended' = 'closed';
  private _sourceBuffer: MockSourceBuffer | null = null;

  addSourceBuffer = vi.fn((_mime: string) => {
    this._sourceBuffer = new MockSourceBuffer();
    return this._sourceBuffer as unknown as SourceBuffer;
  });

  removeSourceBuffer = vi.fn();
  endOfStream = vi.fn();

  /** Test helper to simulate sourceopen. */
  simulateOpen(): void {
    this.readyState = 'open';
    this.dispatchEvent(new Event('sourceopen'));
  }

  get sourceBuffer(): MockSourceBuffer | null {
    return this._sourceBuffer;
  }
}

let capturedMediaSource: MockMediaSource | undefined;

beforeEach(() => {
  capturedMediaSource = undefined;

  const CapturingMediaSource = vi.fn(function (this: MockMediaSource) {
    const instance = new MockMediaSource();
    capturedMediaSource = instance;
    return instance;
  }) as unknown as typeof MediaSource;

  vi.stubGlobal('MediaSource', CapturingMediaSource);
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });

  vi.useFakeTimers();
});

afterEach(() => {
  // Clean up any video elements left in the DOM from previous tests.
  // Safe: empty string removes all children without introducing content.
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function getMS(): MockMediaSource {
  if (!capturedMediaSource) throw new Error('No MockMediaSource captured');
  return capturedMediaSource;
}

/** Helper: patch the hidden video element to support captureStream and play. */
function patchVideo(): { video: HTMLVideoElement; mockStream: MediaStream } {
  const video = document.querySelector('video')!;
  const mockTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
  const mockStream = {
    id: 'mock-stream',
    getTracks: () => [mockTrack],
  } as unknown as MediaStream;
  (video as any).captureStream = vi.fn(() => mockStream);
  (video as any).play = vi.fn(() => Promise.resolve());
  return { video, mockStream };
}

// ─── Import under test (after mocks) ────────────────────────────────────────

import { MseRenderer } from '../../src/core/mse-renderer';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MseRenderer', () => {
  it('creates a hidden video element and attaches MediaSource', () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });

    expect(capturedMediaSource).toBeDefined();
    expect(renderer.disposed).toBe(false);
    // Video element should be in the DOM.
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.style.opacity).toBe('0');
    expect(video?.style.position).toBe('fixed');
    expect(video?.muted).toBe(true);
  });

  it('creates SourceBuffer with the provided MIME on sourceopen', () => {
    new MseRenderer({ mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' });
    const ms = getMS();

    // Patch video so captureOutputStream does not emit an error.
    patchVideo();
    ms.simulateOpen();

    expect(ms.addSourceBuffer).toHaveBeenCalledWith(
      'video/mp4; codecs="hev1.1.6.L93.B0"',
    );
  });

  it('sets SourceBuffer mode to sequence', () => {
    new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();

    expect(ms.sourceBuffer!.mode).toBe('sequence');
  });

  it('emits stream event when captureStream is available', () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    const { mockStream } = patchVideo();

    const streamListener = vi.fn();
    renderer.on('stream', streamListener);

    ms.simulateOpen();
    document.querySelector('video')!.dispatchEvent(new Event('loadedmetadata'));

    expect(streamListener).toHaveBeenCalledOnce();
    expect(streamListener).toHaveBeenCalledWith(mockStream);
    expect(renderer.stream).toBe(mockStream);
  });

  it('emits error event when captureStream is not supported', () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();

    // No captureStream on the video element (jsdom default).
    const video = document.querySelector('video')!;
    (video as any).play = vi.fn(() => Promise.resolve());

    const errorListener = vi.fn();
    renderer.on('error', errorListener);

    ms.simulateOpen();
    document.querySelector('video')!.dispatchEvent(new Event('loadedmetadata'));

    expect(errorListener).toHaveBeenCalledOnce();
    expect(errorListener).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('captureStream') }),
    );
  });

  it('appendBuffer queues data before sourceopen and flushes via updateend chain', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();

    const data1 = new ArrayBuffer(8);
    const data2 = new ArrayBuffer(16);

    // Append before sourceopen — should be queued (sourceBuffer is null).
    renderer.appendBuffer(data1);
    renderer.appendBuffer(data2);

    // Set up captureStream mock.
    patchVideo();

    // Open the MediaSource -> SourceBuffer is created.
    ms.simulateOpen();

    const sb = ms.sourceBuffer!;

    // Pending buffers are NOT auto-flushed on sourceopen; the flushPending
    // method only runs from the updateend listener. Trigger the chain by
    // appending new data now that the SourceBuffer is ready.
    const data3 = new ArrayBuffer(24);
    renderer.appendBuffer(data3);

    // data3 is appended directly (sourceBuffer ready, not currently appending).
    expect(sb.appendBuffer).toHaveBeenNthCalledWith(1, data3);

    // Flush microtasks to process the updateend -> flushPending chain.
    await vi.advanceTimersByTimeAsync(0);

    // The pending buffers are now flushed in FIFO order after data3.
    expect(sb.appendBuffer).toHaveBeenNthCalledWith(2, data1);
    expect(sb.appendBuffer).toHaveBeenNthCalledWith(3, data2);
    expect(sb.appendBuffer).toHaveBeenCalledTimes(3);
  });

  it('appendBuffer passes data directly when SourceBuffer is ready', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();
    // Let any post-open microtasks settle.
    await vi.advanceTimersByTimeAsync(0);

    const sb = ms.sourceBuffer!;
    const data = new ArrayBuffer(32);

    renderer.appendBuffer(data);

    expect(sb.appendBuffer).toHaveBeenCalledWith(data);
  });

  it('queues data while SourceBuffer is updating', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();
    await vi.advanceTimersByTimeAsync(0);

    const sb = ms.sourceBuffer!;
    const data1 = new ArrayBuffer(8);
    const data2 = new ArrayBuffer(16);

    // First append goes directly.
    renderer.appendBuffer(data1);
    expect(sb.appendBuffer).toHaveBeenCalledTimes(1);

    // Second append while first is in-flight should be queued (appending is true).
    renderer.appendBuffer(data2);
    expect(sb.appendBuffer).toHaveBeenCalledTimes(1);

    // After updateend chain completes, queued data is flushed.
    await vi.advanceTimersByTimeAsync(0);
    expect(sb.appendBuffer).toHaveBeenCalledTimes(2);
    expect(sb.appendBuffer).toHaveBeenNthCalledWith(2, data2);
  });

  it('does not append after disposal', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();
    await vi.advanceTimersByTimeAsync(0);

    const sb = ms.sourceBuffer!;
    sb.appendBuffer.mockClear();

    await renderer.dispose();

    renderer.appendBuffer(new ArrayBuffer(8));

    expect(sb.appendBuffer).not.toHaveBeenCalled();
  });

  it('disposes cleanly: revokes URL, removes video element, stops tracks', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    const { mockStream } = patchVideo();
    const mockTrack = mockStream.getTracks()[0];

    ms.simulateOpen();
    document.querySelector('video')!.dispatchEvent(new Event('loadedmetadata'));

    expect(renderer.stream).toBe(mockStream);

    await renderer.dispose();

    expect(renderer.disposed).toBe(true);
    expect((mockTrack as any).stop).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(renderer.stream).toBeNull();
    // Video should be removed from DOM.
    expect(document.querySelector('video')).toBeNull();
  });

  it('calls removeSourceBuffer and endOfStream on disposal when open', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();

    await renderer.dispose();

    expect(ms.removeSourceBuffer).toHaveBeenCalled();
    expect(ms.endOfStream).toHaveBeenCalled();
  });

  it('trims buffer when playback head is past threshold', () => {
    new MseRenderer({
      mime: 'video/mp4',
      trimIntervalMs: 1000,
      maxBufferBehindS: 3,
    });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();
    const sb = ms.sourceBuffer!;

    // Simulate the video having played to 10 seconds.
    const video = document.querySelector('video')!;
    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });

    // Advance past the trim interval.
    vi.advanceTimersByTime(1000);

    // trimBuffer should call remove(0, currentTime - maxBufferBehindS) = remove(0, 7).
    expect(sb.remove).toHaveBeenCalledWith(0, 7);
  });

  it('does not trim when currentTime is within threshold', () => {
    new MseRenderer({
      mime: 'video/mp4',
      trimIntervalMs: 1000,
      maxBufferBehindS: 5,
    });
    const ms = getMS();
    patchVideo();

    ms.simulateOpen();
    const sb = ms.sourceBuffer!;

    // currentTime defaults to 0 in jsdom, which is <= maxBufferBehindS.
    vi.advanceTimersByTime(1000);

    expect(sb.remove).not.toHaveBeenCalled();
  });

  it('on() returns a cleanup function that removes the listener', () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });
    const ms = getMS();
    patchVideo();

    const streamListener = vi.fn();
    const off = renderer.on('stream', streamListener);

    // Remove the listener before sourceopen fires.
    off();

    ms.simulateOpen();

    expect(streamListener).not.toHaveBeenCalled();
  });

  it('double dispose is safe', async () => {
    const renderer = new MseRenderer({ mime: 'video/mp4' });

    await renderer.dispose();
    expect(() => renderer.dispose()).not.toThrow();
  });
});
