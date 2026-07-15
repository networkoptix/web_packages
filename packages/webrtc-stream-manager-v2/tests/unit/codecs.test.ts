// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isH265Codec,
  codecRequiresMse,
  isMseSupported,
  browserSupportsH265WebRTC,
  _resetH265Cache,
  extractPlayingCodecMime,
} from '../../src/utils/codecs';
import { KnownCodec } from '../../src/types';

describe('KnownCodec.H265', () => {
  it('should equal 173', () => {
    expect(KnownCodec.H265).toBe(173);
  });
});

describe('isH265Codec', () => {
  it('should return true for codec 173', () => {
    expect(isH265Codec(173)).toBe(true);
  });

  it('should return true when compared against KnownCodec.H265 constant', () => {
    expect(isH265Codec(KnownCodec.H265)).toBe(true);
  });

  it('should return false for other numeric codec values', () => {
    expect(isH265Codec(0)).toBe(false);
    expect(isH265Codec(1)).toBe(false);
    expect(isH265Codec(7)).toBe(false);
    expect(isH265Codec(172)).toBe(false);
    expect(isH265Codec(174)).toBe(false);
    expect(isH265Codec(999)).toBe(false);
  });
});

describe('browserSupportsH265WebRTC', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _resetH265Cache();
  });

  it('should return false when RTCRtpReceiver is undefined', () => {
    vi.stubGlobal('RTCRtpReceiver', undefined);
    expect(browserSupportsH265WebRTC()).toBe(false);
  });

  it('should return false when getCapabilities is not a function', () => {
    vi.stubGlobal('RTCRtpReceiver', {});
    expect(browserSupportsH265WebRTC()).toBe(false);
  });

  it('should return false when getCapabilities returns null', () => {
    vi.stubGlobal('RTCRtpReceiver', {
      getCapabilities: vi.fn(() => null),
    });
    expect(browserSupportsH265WebRTC()).toBe(false);
  });

  it('should return false when no H265/HEVC codec is listed', () => {
    vi.stubGlobal('RTCRtpReceiver', {
      getCapabilities: vi.fn(() => ({
        codecs: [
          { mimeType: 'video/VP8' },
          { mimeType: 'video/VP9' },
          { mimeType: 'video/H264' },
        ],
      })),
    });
    expect(browserSupportsH265WebRTC()).toBe(false);
  });

  it('should return true when video/h265 codec is listed', () => {
    vi.stubGlobal('RTCRtpReceiver', {
      getCapabilities: vi.fn(() => ({
        codecs: [
          { mimeType: 'video/VP8' },
          { mimeType: 'video/H265' },
        ],
      })),
    });
    expect(browserSupportsH265WebRTC()).toBe(true);
  });

  it('should return true when video/hevc codec is listed (case-insensitive)', () => {
    vi.stubGlobal('RTCRtpReceiver', {
      getCapabilities: vi.fn(() => ({
        codecs: [{ mimeType: 'video/HEVC' }],
      })),
    });
    expect(browserSupportsH265WebRTC()).toBe(true);
  });
});

describe('isMseSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return true when MediaSource is available with isTypeSupported', () => {
    vi.stubGlobal('MediaSource', {
      isTypeSupported: vi.fn(() => true),
    });
    expect(isMseSupported()).toBe(true);
  });

  it('should return false when MediaSource is undefined', () => {
    vi.stubGlobal('MediaSource', undefined);
    expect(isMseSupported()).toBe(false);
  });

  it('should return false when isTypeSupported is not a function', () => {
    vi.stubGlobal('MediaSource', {});
    expect(isMseSupported()).toBe(false);
  });
});

describe('codecRequiresMse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _resetH265Cache();
  });

  it('should return true for H265 when browser does not support H265 WebRTC', () => {
    // Simulate no RTCRtpReceiver -> browserSupportsH265WebRTC returns false
    vi.stubGlobal('RTCRtpReceiver', undefined);
    expect(codecRequiresMse(KnownCodec.H265)).toBe(true);
  });

  it('should return false for H265 when browser supports H265 WebRTC', () => {
    vi.stubGlobal('RTCRtpReceiver', {
      getCapabilities: vi.fn(() => ({
        codecs: [{ mimeType: 'video/H265' }],
      })),
    });
    expect(codecRequiresMse(KnownCodec.H265)).toBe(false);
  });

  it('should return false for non-H265 codecs', () => {
    vi.stubGlobal('RTCRtpReceiver', undefined);
    expect(codecRequiresMse(0)).toBe(false);
    expect(codecRequiresMse(1)).toBe(false);
    expect(codecRequiresMse(172)).toBe(false);
    expect(codecRequiresMse(174)).toBe(false);
  });
});

describe('extractPlayingCodecMime', () => {
  const statsMap = (reports: Record<string, unknown>[]): Map<string, unknown> =>
    new Map(reports.map((report, i) => {
      const id = (report as { id?: string }).id ?? `report-${i}`;
      return [id, { id, ...report }];
    }));

  it('resolves the video codec mime via the inbound-rtp codecId', () => {
    const stats = statsMap([
      { type: 'codec', id: 'codec-audio', mimeType: 'audio/opus' },
      { type: 'codec', id: 'codec-video', mimeType: 'video/H264' },
      { type: 'inbound-rtp', kind: 'video', codecId: 'codec-video' },
      { type: 'inbound-rtp', kind: 'audio', codecId: 'codec-audio' },
    ]);
    expect(extractPlayingCodecMime(stats as unknown as RTCStatsReport)).toBe('video/H264');
  });

  it('reports H265 when the delivered track is H265', () => {
    const stats = statsMap([
      { type: 'codec', id: 'codec-video', mimeType: 'video/H265' },
      { type: 'inbound-rtp', kind: 'video', codecId: 'codec-video' },
    ]);
    expect(extractPlayingCodecMime(stats as unknown as RTCStatsReport)).toBe('video/H265');
  });

  it('returns empty string when there is no inbound video report', () => {
    const stats = statsMap([
      { type: 'codec', id: 'codec-audio', mimeType: 'audio/opus' },
      { type: 'inbound-rtp', kind: 'audio', codecId: 'codec-audio' },
    ]);
    expect(extractPlayingCodecMime(stats as unknown as RTCStatsReport)).toBe('');
  });

  it('returns empty string when the codec report is missing', () => {
    const stats = statsMap([
      { type: 'inbound-rtp', kind: 'video', codecId: 'codec-video' },
    ]);
    expect(extractPlayingCodecMime(stats as unknown as RTCStatsReport)).toBe('');
  });

  it('returns empty string for empty stats', () => {
    expect(extractPlayingCodecMime(new Map() as unknown as RTCStatsReport)).toBe('');
  });
});
