// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GopDecoder, type DecodeRun } from '../../../src/stepping/gop-decoder';
import type { SampleConfig, StoreSample } from '../../../src/stepping/sample-store';

// ─── WebCodecs mocks (jsdom has none) ───────────────────────────────────────

class MockVideoFrame {
  closed = false;
  allocationSize?: () => number;
  constructor(
    public readonly timestamp: number,
    public readonly codedWidth = 64,
    public readonly codedHeight = 48,
  ) {
    if (mockState.allocationBytes !== null || mockState.allocationThrows) {
      this.allocationSize = () => {
        if (mockState.allocationThrows) {
          throw new DOMException('opaque frame', 'NotSupportedError');
        }
        return mockState.allocationBytes!;
      };
    }
  }

  close(): void {
    this.closed = true;
  }
}

interface MockChunkInit {
  type: 'key' | 'delta';
  timestamp: number;
  data: Uint8Array;
}

class MockEncodedVideoChunk {
  type: string;
  timestamp: number;
  data: Uint8Array;
  constructor(init: MockChunkInit) {
    this.type = init.type;
    this.timestamp = init.timestamp;
    this.data = init.data;
  }
}

const mockState = {
  decoders: [] as MockVideoDecoder[],
  /** Indices (per run) the decoder should silently drop (corruption sim). */
  dropOutputs: new Set<number>(),
  supported: true,
  /** Codec strings probed via isConfigSupported, in order. */
  isConfigSupportedCalls: [] as string[],
  /** When set, frames expose allocationSize() returning this. */
  allocationBytes: null as number | null,
  /** When set, allocationSize() throws (GPU-opaque frame sim). */
  allocationThrows: false,
  /** Flush fires the error callback then rejects (decoder fault sim). */
  errorOnFlush: false,
  /** Flush never settles — no output, no error (wedged HW decoder sim). */
  hangOnFlush: false,
};

class MockVideoDecoder {
  state: 'unconfigured' | 'configured' | 'closed' = 'unconfigured';
  configureCalls: unknown[] = [];
  decodedChunks: MockEncodedVideoChunk[] = [];
  private pending: MockEncodedVideoChunk[] = [];

  constructor(
    public readonly init: {
      output: (frame: MockVideoFrame) => void;
      error: (e: unknown) => void;
    },
  ) {
    mockState.decoders.push(this);
  }

  static isConfigSupported(config: { codec: string }): Promise<{ supported: boolean }> {
    mockState.isConfigSupportedCalls.push(config.codec);
    return Promise.resolve({ supported: mockState.supported });
  }

  configure(config: unknown): void {
    this.state = 'configured';
    this.configureCalls.push(config);
  }

  decode(chunk: MockEncodedVideoChunk): void {
    this.decodedChunks.push(chunk);
    this.pending.push(chunk);
  }

  async flush(): Promise<void> {
    await Promise.resolve(); // flush is genuinely async
    if (mockState.hangOnFlush) {
      return new Promise<void>(() => undefined);
    }
    const batch = this.pending;
    this.pending = [];
    if (mockState.errorOnFlush) {
      // Real decoders fault via the error callback AND reject the flush.
      this.init.error(new DOMException('decoder fault', 'EncodingError'));
      throw new Error('flush rejected');
    }
    batch.forEach((chunk, i) => {
      if (mockState.dropOutputs.has(i)) return;
      this.init.output(new MockVideoFrame(chunk.timestamp));
    });
  }

  close(): void {
    this.state = 'closed';
  }

  /** Test helper: fire the error callback like a real decoder fault. */
  simulateError(): void {
    this.init.error(new Error('decode fault'));
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TIMESCALE = 15360;
const T0_TICKS = 1_780_000_000_000 * (TIMESCALE / 1000);

const CONFIG_A: SampleConfig = { codec: 'avc1.420032', description: new Uint8Array([1, 0x42, 0x00, 0x32, 0xff]) };
const CONFIG_B: SampleConfig = { codec: 'avc1.640028', description: new Uint8Array([1, 0x64, 0x00, 0x28, 0xff]) };

function makeRun(
  count: number,
  targetIndex: number,
  keyIndices = [0],
  config: SampleConfig = CONFIG_A,
  baseTicks = T0_TICKS,
): DecodeRun {
  const samples: StoreSample[] = Array.from({ length: count }, (_, i) => ({
    ticks: baseTicks + i * 512,
    durationTicks: 512,
    key: keyIndices.includes(i),
    bytes: new Uint8Array(100 + i),
    configEpoch: 0,
  }));
  return { samples, targetIndex, config };
}

function makeDecoder(byteCapBytes?: number): GopDecoder {
  return new GopDecoder({ timescale: TIMESCALE, byteCapBytes });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GopDecoder', () => {
  beforeEach(() => {
    mockState.decoders = [];
    mockState.dropOutputs = new Set();
    mockState.supported = true;
    mockState.isConfigSupportedCalls = [];
    mockState.allocationBytes = null;
    mockState.allocationThrows = false;
    mockState.errorOnFlush = false;
    mockState.hangOnFlush = false;
    GopDecoder.lastDecodeFailure = null;
    vi.stubGlobal('VideoDecoder', MockVideoDecoder);
    vi.stubGlobal('EncodedVideoChunk', MockEncodedVideoChunk);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('decodes a key-led run and returns the target frame, caching the whole run', async () => {
    const decoder = makeDecoder();
    const run = makeRun(5, 2);

    const frame = await decoder.frameAt(run);

    expect(frame).toBeInstanceOf(MockVideoFrame);
    expect((frame as unknown as MockVideoFrame).timestamp).toBe(
      Math.round((run.samples[2].ticks * 1_000_000) / TIMESCALE),
    );
    expect(decoder.cachedFrameCount).toBe(5);

    const dec = mockState.decoders[0];
    expect(dec.configureCalls).toHaveLength(1);
    expect(dec.configureCalls[0]).toMatchObject({ codec: 'avc1.420032' });
    expect(dec.decodedChunks.map((c) => c.type)).toEqual([
      'key', 'delta', 'delta', 'delta', 'delta',
    ]);
    decoder.dispose();
  });

  it('serves repeat requests from cache without re-decoding', async () => {
    const decoder = makeDecoder();
    const run = makeRun(3, 2);

    const first = await decoder.frameAt(run);
    const chunksAfterFirst = mockState.decoders[0].decodedChunks.length;

    // Same GOP, earlier target — typical backward stepping.
    const second = await decoder.frameAt({ ...run, targetIndex: 1 });
    expect(mockState.decoders[0].decodedChunks.length).toBe(chunksAfterFirst);
    expect(second).not.toBe(first);
    expect((second as unknown as MockVideoFrame).closed).toBe(false);
    decoder.dispose();
  });

  it('rejects a run that does not start at a sync sample', async () => {
    const decoder = makeDecoder();
    const run = makeRun(3, 1, []); // no keyframes at all

    await expect(decoder.frameAt(run)).rejects.toThrow('sync sample');
    expect(decoder.lastDecodeFailure?.phase).toBe('invalid-run');
    decoder.dispose();
  });

  it('serializes overlapping decode requests', async () => {
    const decoder = makeDecoder();
    const runA = makeRun(3, 2);
    const runB: DecodeRun = {
      samples: runA.samples.map((s) => ({ ...s, ticks: s.ticks + 10_000 })),
      targetIndex: 0,
      config: CONFIG_A,
    };

    const [a, b] = await Promise.all([decoder.frameAt(runA), decoder.frameAt(runB)]);
    expect((a as unknown as MockVideoFrame).closed).toBe(false);
    expect((b as unknown as MockVideoFrame).closed).toBe(false);
    expect(decoder.cachedFrameCount).toBe(6);
    decoder.dispose();
  });

  it('trimAbove closes and evicts frames past the cursor', async () => {
    const decoder = makeDecoder();
    const run = makeRun(5, 4);
    await decoder.frameAt(run);

    const cursor = run.samples[2].ticks;
    decoder.trimAbove(cursor);

    expect(decoder.cachedFrameCount).toBe(3);
    expect(decoder.cachedFrame(run.samples[3].ticks)).toBeNull();
    expect(decoder.cachedFrame(cursor)).not.toBeNull();
    decoder.dispose();
  });

  it('evicts FIFO when over the byte cap, protecting the just-inserted frame', async () => {
    // 64×48 NV12 ≈ 4608 B/frame; cap to ~3 frames.
    const decoder = makeDecoder(14_000);
    await decoder.frameAt(makeRun(5, 4));

    expect(decoder.cachedFrameCount).toBeLessThanOrEqual(3);
    expect(decoder.cacheByteLength).toBeLessThanOrEqual(14_000);
    decoder.dispose();
  });

  it('fails the run when the decoder drops the target frame', async () => {
    mockState.dropOutputs = new Set([2]);
    const decoder = makeDecoder();

    await expect(decoder.frameAt(makeRun(3, 2))).rejects.toThrow(
      'no frame for the target sample',
    );
    expect(decoder.failed).toBe(true);
    await expect(decoder.frameAt(makeRun(3, 0))).rejects.toThrow('failed');
    decoder.dispose();
  });

  it('dispose closes every cached frame and the underlying decoder', async () => {
    const decoder = makeDecoder();
    const run = makeRun(3, 2);
    const frame = (await decoder.frameAt(run)) as unknown as MockVideoFrame;

    decoder.dispose();

    expect(frame.closed).toBe(true);
    expect(decoder.cachedFrameCount).toBe(0);
    expect(mockState.decoders[0].state).toBe('closed');
    expect(decoder.disposed).toBe(true);
    await expect(decoder.frameAt(run)).rejects.toThrow('disposed');
  });

  it('reconfigures across a codec boundary, retaining the decoded cache', async () => {
    const decoder = makeDecoder();
    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_A));
    expect(mockState.decoders).toHaveLength(1);
    const cachedAfterA = decoder.cachedFrameCount;

    // A run from the other side of the boundary: different ticks, config B.
    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_B, T0_TICKS - 100_000));

    // Reconfigured into a fresh decoder; the old one was closed.
    expect(mockState.decoders).toHaveLength(2);
    expect(mockState.decoders[0].state).toBe('closed');
    expect(mockState.decoders[1].configureCalls[0]).toMatchObject({ codec: CONFIG_B.codec });
    // A's frames survive — ticks belong to one epoch, so they stay valid.
    expect(decoder.cachedFrameCount).toBe(cachedAfterA + 3);
    decoder.dispose();
  });

  it('does not reconfigure when a cache-miss run carries the same config', async () => {
    const decoder = makeDecoder();
    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_A));
    // Different ticks (cache miss) but byte-identical config → same decoder.
    await decoder.frameAt(makeRun(3, 2, [0],
      { codec: 'avc1.420032', description: new Uint8Array([1, 0x42, 0x00, 0x32, 0xff]) },
      T0_TICKS + 100_000,
    ));
    expect(mockState.decoders).toHaveLength(1);
    decoder.dispose();
  });

  it('crossing the boundary back is a cache hit — no extra decoder', async () => {
    const decoder = makeDecoder();
    const runA = makeRun(3, 2, [0], CONFIG_A);
    await decoder.frameAt(runA);
    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_B, T0_TICKS - 100_000));
    expect(mockState.decoders).toHaveLength(2);

    // Step back into A's GOP: already cached → returned without reconfigure.
    const frameA = (await decoder.frameAt(runA)) as unknown as MockVideoFrame;
    expect(mockState.decoders).toHaveLength(2);
    expect(frameA.closed).toBe(false);
    decoder.dispose();
  });

  it('isSupported probes VideoDecoder.isConfigSupported', async () => {
    await expect(GopDecoder.isSupported('avc1.420032', new Uint8Array(5))).resolves.toBe(true);
    mockState.supported = false;
    await expect(GopDecoder.isSupported('avc1.420032', new Uint8Array(5))).resolves.toBe(false);
    vi.unstubAllGlobals();
    // No WebCodecs at all (jsdom reality) → unsupported, not a crash.
    await expect(GopDecoder.isSupported('avc1.420032', new Uint8Array(5))).resolves.toBe(false);
  });

  // ── Capability gate & failure snapshots ─────────────────────────────────

  it('gates an unsupported config upfront with the codec in the reason', async () => {
    mockState.supported = false;
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const decoder = new GopDecoder({ timescale: TIMESCALE, logger });

    await expect(decoder.frameAt(makeRun(3, 1))).rejects.toThrow(
      'codec not supported by WebCodecs: avc1.420032',
    );
    // Gated before any VideoDecoder was constructed or fed data.
    expect(mockState.decoders).toHaveLength(0);
    expect(decoder.lastDecodeFailure?.phase).toBe('unsupported-config');
    expect(logger.warn).toHaveBeenCalledWith(
      '[GopDecoder] decode failure',
      expect.objectContaining({ phase: 'unsupported-config', codec: 'avc1.420032' }),
    );
    decoder.dispose();
  });

  it('probes support once per active config, again at a codec boundary', async () => {
    const decoder = makeDecoder();
    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_A));
    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_A, T0_TICKS + 100_000));
    expect(mockState.isConfigSupportedCalls).toEqual([CONFIG_A.codec]);

    await decoder.frameAt(makeRun(3, 2, [0], CONFIG_B, T0_TICKS - 100_000));
    expect(mockState.isConfigSupportedCalls).toEqual([CONFIG_A.codec, CONFIG_B.codec]);
    decoder.dispose();
  });

  it('an unsupported boundary config degrades only the new epoch', async () => {
    const decoder = makeDecoder();
    const runA = makeRun(3, 2, [0], CONFIG_A);
    await decoder.frameAt(runA);

    mockState.supported = false;
    await expect(
      decoder.frameAt(makeRun(3, 2, [0], CONFIG_B, T0_TICKS - 100_000)),
    ).rejects.toThrow(`codec not supported by WebCodecs: ${CONFIG_B.codec}`);

    // The old epoch's decoder and cache stay serviceable.
    const frameA = (await decoder.frameAt(runA)) as unknown as MockVideoFrame;
    expect(frameA.closed).toBe(false);
    decoder.dispose();
  });

  it('failure snapshot carries the config, run shape, and error identity', async () => {
    // Dropping the last output leaves the target tick unpaired (frames pair
    // in presentation order, so only the run's tail can go missing).
    mockState.dropOutputs = new Set([3]);
    const decoder = new GopDecoder({
      timescale: TIMESCALE,
      codedWidth: 2048,
      codedHeight: 1536,
    });
    const run = makeRun(4, 3, [0, 2]);

    await expect(decoder.frameAt(run)).rejects.toThrow('no frame for the target sample');

    const snap = decoder.lastDecodeFailure!;
    expect(snap.phase).toBe('missing-target');
    expect(snap.errorName).toBe('Error');
    expect(snap.errorMessage).toContain('no frame for the target sample');
    expect(snap.codec).toBe(CONFIG_A.codec);
    expect(snap.descriptionByteLength).toBe(5);
    expect(snap.descriptionHead).toBe('01 42 00 32 ff');
    expect(snap.timescale).toBe(TIMESCALE);
    expect(snap.codedWidth).toBe(2048);
    expect(snap.codedHeight).toBe(1536);
    expect(snap.sampleCount).toBe(4);
    expect(snap.targetIndex).toBe(3);
    expect(snap.firstTicks).toBe(run.samples[0].ticks);
    expect(snap.lastTicks).toBe(run.samples[3].ticks);
    expect(snap.keySampleIndices).toEqual([0, 2]);
    expect(snap.lastOutput).toEqual({ codedWidth: 64, codedHeight: 48 });
    decoder.dispose();
  });

  it('a decoder fault records decoder-error with the underlying DOMException', async () => {
    mockState.errorOnFlush = true;
    const decoder = makeDecoder();

    await expect(decoder.frameAt(makeRun(3, 1))).rejects.toThrow('flush rejected');

    // The error callback's precise snapshot wins over the generic wrapper.
    const snap = decoder.lastDecodeFailure!;
    expect(snap.phase).toBe('decoder-error');
    expect(snap.errorName).toBe('EncodingError');
    expect(snap.errorMessage).toBe('decoder fault');
    expect(snap.sampleCount).toBe(3); // in-flight run context attached
    expect(snap.targetIndex).toBe(1);
    expect(decoder.failed).toBe(true);
    decoder.dispose();
  });

  it('mirrors the snapshot on the static and keeps both past dispose', async () => {
    mockState.dropOutputs = new Set([1]);
    const decoder = makeDecoder();
    await expect(decoder.frameAt(makeRun(2, 1))).rejects.toThrow();

    decoder.dispose();

    expect(decoder.lastDecodeFailure?.phase).toBe('missing-target');
    expect(GopDecoder.lastDecodeFailure).toBe(decoder.lastDecodeFailure);
  });

  // ── Cache accounting ─────────────────────────────────────────────────────

  it('uses frame.allocationSize for cache accounting when available', async () => {
    mockState.allocationBytes = 1_000;
    const decoder = makeDecoder();
    const run = makeRun(3, 2);

    await decoder.frameAt(run);
    expect(decoder.cacheByteLength).toBe(3_000);

    // Symmetric on eviction: the insert-time cost is what gets subtracted.
    decoder.trimAbove(run.samples[0].ticks);
    expect(decoder.cacheByteLength).toBe(1_000);
    decoder.dispose();
    expect(decoder.cacheByteLength).toBe(0);
  });

  it('falls back to the NV12 estimate when allocationSize throws', async () => {
    mockState.allocationThrows = true;
    const decoder = makeDecoder();

    await decoder.frameAt(makeRun(2, 1));
    expect(decoder.cacheByteLength).toBe(2 * 64 * 48 * 1.5);
    decoder.dispose();
  });

  // ── Decode deadline ──────────────────────────────────────────────────────

  describe('decode deadline', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('a flush that never settles rejects at the deadline and fails the decoder', async () => {
      mockState.hangOnFlush = true;
      const decoder = new GopDecoder({ timescale: TIMESCALE, decodeTimeoutMs: 5_000 });

      const pending = decoder.frameAt(makeRun(3, 1));
      const rejected = expect(pending).rejects.toThrow('no result within 5000 ms');
      await vi.advanceTimersByTimeAsync(5_000);
      await rejected;

      expect(decoder.failed).toBe(true);
      expect(decoder.lastDecodeFailure?.phase).toBe('decode-timeout');
      // The wedged hardware decoder was closed, not left running.
      expect(mockState.decoders[0].state).toBe('closed');
      decoder.dispose();
    });

    it('a run queued behind a hung one rejects too — the chain is not poisoned', async () => {
      mockState.hangOnFlush = true;
      const decoder = new GopDecoder({ timescale: TIMESCALE, decodeTimeoutMs: 5_000 });

      const first = decoder.frameAt(makeRun(3, 1));
      const second = decoder.frameAt(makeRun(3, 1, [0], CONFIG_A, T0_TICKS + 100_000));
      const firstRejected = expect(first).rejects.toThrow('no result within');
      const secondRejected = expect(second).rejects.toThrow('GopDecoder failed');
      await vi.advanceTimersByTimeAsync(5_000);
      await firstRejected;
      await secondRejected;

      // A replacement instance (the stepper's recovery move) decodes normally.
      mockState.hangOnFlush = false;
      const fresh = new GopDecoder({ timescale: TIMESCALE, decodeTimeoutMs: 5_000 });
      await expect(fresh.frameAt(makeRun(3, 1))).resolves.toBeInstanceOf(MockVideoFrame);
      decoder.dispose();
      fresh.dispose();
    });

    it('a normal decode clears the deadline — no failure recorded afterwards', async () => {
      const decoder = new GopDecoder({ timescale: TIMESCALE, decodeTimeoutMs: 5_000 });

      await decoder.frameAt(makeRun(3, 1));
      await vi.advanceTimersByTimeAsync(10_000);

      expect(decoder.failed).toBe(false);
      expect(decoder.lastDecodeFailure).toBeNull();
      expect(mockState.decoders[0].state).toBe('configured');
      decoder.dispose();
    });

    it('a timeout after dispose is teardown, not a failure', async () => {
      mockState.hangOnFlush = true;
      const decoder = new GopDecoder({ timescale: TIMESCALE, decodeTimeoutMs: 5_000 });

      const pending = decoder.frameAt(makeRun(3, 1));
      const rejected = expect(pending).rejects.toThrow('disposed');
      decoder.dispose();
      await vi.advanceTimersByTimeAsync(5_000);
      await rejected;

      expect(decoder.lastDecodeFailure).toBeNull();
    });
  });
});
