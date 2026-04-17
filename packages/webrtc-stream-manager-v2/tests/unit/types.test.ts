// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';
import {
  ConnectionError,
  AvailableStreams,
  ApiVersions,
  TargetStream,
  RequiresTranscoding,
  PeerState,
  KnownCodec,
  isTimeStampMessage,
  isConfirmationMessage,
  isStreamChangeMessage,
  isRequiresTranscoding,
  isTranscodingMessage,
  isMimeInit,
  isNativeWebRtcCodec,
} from '../../src/types';

// ─── Enum value tests ────────────────────────────────────────────────────────

describe('ConnectionError enum', () => {
  it('should have the correct string values', () => {
    expect(ConnectionError.websocket).toBe('websocket');
    expect(ConnectionError.authorization).toBe('authorization');
    expect(ConnectionError.lostConnection).toBe('lostConnection');
    expect(ConnectionError.proxyDisabled).toBe('proxyDisabled');
    expect(ConnectionError.transcodingDisabled).toBe('transcodingDisabled');
    expect(ConnectionError.mjpegDisabled).toBe('mjpegDisabled');
    expect(ConnectionError.invalidAccessToken).toBe('invalidAccessToken');
  });

  it('should contain exactly 8 members', () => {
    expect(Object.values(ConnectionError)).toHaveLength(8);
  });

  it('should have transcodingRequired member', () => {
    expect(ConnectionError.transcodingRequired).toBe('transcodingRequired');
  });
});

describe('AvailableStreams enum', () => {
  it('should have the correct numeric values', () => {
    expect(AvailableStreams.PRIMARY).toBe(0);
    expect(AvailableStreams.SECONDARY).toBe(1);
  });

  it('should contain exactly 2 numeric members', () => {
    const numericValues = Object.values(AvailableStreams).filter(
      (v) => typeof v === 'number',
    );
    expect(numericValues).toHaveLength(2);
  });
});

describe('ApiVersions enum', () => {
  it('should have the correct string values', () => {
    expect(ApiVersions.v1).toBe('v1');
    expect(ApiVersions.v2).toBe('v2');
  });

  it('should contain exactly 2 members', () => {
    expect(Object.values(ApiVersions)).toHaveLength(2);
  });
});

describe('TargetStream enum', () => {
  it('should have the correct string values', () => {
    expect(TargetStream.AUTO).toBe('AUTO');
    expect(TargetStream.HIGH).toBe('HIGH');
    expect(TargetStream.LOW).toBe('LOW');
  });

  it('should contain exactly 3 members', () => {
    expect(Object.values(TargetStream)).toHaveLength(3);
  });
});

describe('RequiresTranscoding enum', () => {
  it('should map MJPEG to 7', () => {
    expect(RequiresTranscoding.MJPEG).toBe(7);
  });

  it('should contain exactly 1 numeric member', () => {
    const numericValues = Object.values(RequiresTranscoding).filter(
      (v) => typeof v === 'number',
    );
    expect(numericValues).toHaveLength(1);
  });
});

describe('KnownCodec', () => {
  it('should have correct codec identifiers', () => {
    expect(KnownCodec.H264).toBe(27);
    expect(KnownCodec.H265).toBe(173);
    expect(KnownCodec.MJPEG).toBe(7);
  });
});

describe('isNativeWebRtcCodec', () => {
  it('should return true for H264', () => {
    expect(isNativeWebRtcCodec(KnownCodec.H264)).toBe(true);
  });

  it('should return true for H265', () => {
    expect(isNativeWebRtcCodec(KnownCodec.H265)).toBe(true);
  });

  it('should return false for MJPEG', () => {
    expect(isNativeWebRtcCodec(KnownCodec.MJPEG)).toBe(false);
  });

  it('should return false for unknown codec values', () => {
    expect(isNativeWebRtcCodec(0)).toBe(false);
    expect(isNativeWebRtcCodec(999)).toBe(false);
  });
});

describe('PeerState enum', () => {
  it('should have the correct string values', () => {
    expect(PeerState.connecting).toBe('connecting');
    expect(PeerState.connected).toBe('connected');
    expect(PeerState.failed).toBe('failed');
  });

  it('should contain exactly 3 members', () => {
    expect(Object.values(PeerState)).toHaveLength(3);
  });
});

// ─── Type guard tests ────────────────────────────────────────────────────────

describe('isRequiresTranscoding', () => {
  it('should return true for RequiresTranscoding.MJPEG (7)', () => {
    expect(isRequiresTranscoding(RequiresTranscoding.MJPEG)).toBe(true);
    expect(isRequiresTranscoding(7)).toBe(true);
  });

  it('should return false for other numeric values', () => {
    expect(isRequiresTranscoding(0)).toBe(false);
    expect(isRequiresTranscoding(1)).toBe(false);
    expect(isRequiresTranscoding(6)).toBe(false);
    expect(isRequiresTranscoding(8)).toBe(false);
    expect(isRequiresTranscoding(99)).toBe(false);
  });

  it('should return false for string values', () => {
    expect(isRequiresTranscoding('7')).toBe(false);
    expect(isRequiresTranscoding('MJPEG')).toBe(false);
    expect(isRequiresTranscoding('mjpeg')).toBe(false);
  });

  it('should return false for non-number, non-string values', () => {
    expect(isRequiresTranscoding(null as unknown as number)).toBe(false);
    expect(isRequiresTranscoding(undefined as unknown as number)).toBe(false);
  });
});

describe('isTimeStampMessage', () => {
  it('should return true for a message with timestamp and rtpTimestamp', () => {
    expect(isTimeStampMessage({ timestamp: 1000, rtpTimestamp: 500 })).toBe(
      true,
    );
  });

  it('should return true for a message with timestampMs and rtpTimestamp', () => {
    expect(
      isTimeStampMessage({ timestampMs: 1000000, rtpTimestamp: 500 }),
    ).toBe(true);
  });

  it('should return true when both timestamp and timestampMs are present', () => {
    expect(
      isTimeStampMessage({
        timestamp: 1000,
        timestampMs: 1000000,
        rtpTimestamp: 500,
      }),
    ).toBe(true);
  });

  it('should return false when rtpTimestamp is missing', () => {
    expect(isTimeStampMessage({ timestamp: 1000 })).toBe(false);
    expect(isTimeStampMessage({ timestampMs: 1000000 })).toBe(false);
  });

  it('should return false when both timestamp and timestampMs are missing', () => {
    expect(isTimeStampMessage({ rtpTimestamp: 500 })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isTimeStampMessage(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isTimeStampMessage(undefined)).toBe(false);
  });

  it('should return false for primitive types', () => {
    expect(isTimeStampMessage(42)).toBe(false);
    expect(isTimeStampMessage('string')).toBe(false);
    expect(isTimeStampMessage(true)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isTimeStampMessage({})).toBe(false);
  });

  it('should return false when fields are non-numeric', () => {
    expect(
      isTimeStampMessage({ timestamp: '1000', rtpTimestamp: '500' }),
    ).toBe(false);
  });
});

describe('isConfirmationMessage', () => {
  it('should return true for { timestamp: -1, status: 200 }', () => {
    expect(isConfirmationMessage({ timestamp: -1, status: 200 })).toBe(true);
  });

  it('should return true when status is 200 (status field is the key check)', () => {
    expect(isConfirmationMessage({ status: 200 })).toBe(true);
    expect(isConfirmationMessage({ status: 200, extra: 'data' })).toBe(true);
  });

  it('should return false for status values other than 200', () => {
    expect(isConfirmationMessage({ timestamp: -1, status: 301 })).toBe(false);
    expect(isConfirmationMessage({ timestamp: -1, status: 404 })).toBe(false);
    expect(isConfirmationMessage({ timestamp: -1, status: 0 })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isConfirmationMessage(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isConfirmationMessage(undefined)).toBe(false);
  });

  it('should return false for primitive types', () => {
    expect(isConfirmationMessage(200)).toBe(false);
    expect(isConfirmationMessage('200')).toBe(false);
    expect(isConfirmationMessage(true)).toBe(false);
  });

  it('should return false for an object without status', () => {
    expect(isConfirmationMessage({ timestamp: -1 })).toBe(false);
    expect(isConfirmationMessage({})).toBe(false);
  });
});

describe('isStreamChangeMessage', () => {
  it('should return true for { timestamp: -1, status: 301 }', () => {
    expect(isStreamChangeMessage({ timestamp: -1, status: 301 })).toBe(true);
  });

  it('should return true when status is 301 (status field is the key check)', () => {
    expect(isStreamChangeMessage({ status: 301 })).toBe(true);
    expect(isStreamChangeMessage({ status: 301, extra: 'data' })).toBe(true);
  });

  it('should return false for status values other than 301', () => {
    expect(isStreamChangeMessage({ timestamp: -1, status: 200 })).toBe(false);
    expect(isStreamChangeMessage({ timestamp: -1, status: 404 })).toBe(false);
    expect(isStreamChangeMessage({ timestamp: -1, status: 0 })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isStreamChangeMessage(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isStreamChangeMessage(undefined)).toBe(false);
  });

  it('should return false for primitive types', () => {
    expect(isStreamChangeMessage(301)).toBe(false);
    expect(isStreamChangeMessage('301')).toBe(false);
    expect(isStreamChangeMessage(true)).toBe(false);
  });

  it('should return false for an object without status', () => {
    expect(isStreamChangeMessage({ timestamp: -1 })).toBe(false);
    expect(isStreamChangeMessage({})).toBe(false);
  });
});

describe('isTranscodingMessage', () => {
  it('should return true for valid transcoding message with video: true', () => {
    expect(isTranscodingMessage({ transcoding: { video: true } })).toBe(true);
  });

  it('should return true for valid transcoding message with video: false', () => {
    expect(isTranscodingMessage({ transcoding: { video: false } })).toBe(true);
  });

  it('should return true when audio field is also present', () => {
    expect(
      isTranscodingMessage({ transcoding: { video: true, audio: false } }),
    ).toBe(true);
  });

  it('should return false for null', () => {
    expect(isTranscodingMessage(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isTranscodingMessage(undefined)).toBe(false);
  });

  it('should return false for primitive types', () => {
    expect(isTranscodingMessage(42)).toBe(false);
    expect(isTranscodingMessage('string')).toBe(false);
    expect(isTranscodingMessage(true)).toBe(false);
  });

  it('should return false when transcoding field is missing', () => {
    expect(isTranscodingMessage({})).toBe(false);
    expect(isTranscodingMessage({ video: true })).toBe(false);
  });

  it('should return false when transcoding.video is not a boolean', () => {
    expect(isTranscodingMessage({ transcoding: { video: 'yes' } })).toBe(
      false,
    );
    expect(isTranscodingMessage({ transcoding: { video: 1 } })).toBe(false);
  });

  it('should return false when transcoding is not an object', () => {
    expect(isTranscodingMessage({ transcoding: 'true' })).toBe(false);
    expect(isTranscodingMessage({ transcoding: null })).toBe(false);
  });
});

describe('isMimeInit', () => {
  it('should return true for valid mime init with codec string', () => {
    expect(
      isMimeInit({ mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' }),
    ).toBe(true);
  });

  it('should return true for simple mime string', () => {
    expect(isMimeInit({ mime: 'video/mp4' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isMimeInit(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isMimeInit(undefined)).toBe(false);
  });

  it('should return false for primitive types', () => {
    expect(isMimeInit(42)).toBe(false);
    expect(isMimeInit('string')).toBe(false);
  });

  it('should return false when mime field is missing', () => {
    expect(isMimeInit({})).toBe(false);
  });

  it('should return false when mime is not a string', () => {
    expect(isMimeInit({ mime: 42 })).toBe(false);
    expect(isMimeInit({ mime: true })).toBe(false);
    expect(isMimeInit({ mime: null })).toBe(false);
  });
});
