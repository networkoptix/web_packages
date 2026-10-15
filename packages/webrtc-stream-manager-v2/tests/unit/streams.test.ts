// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';
import {
  getActualAvailableStreams,
  getActualAvailableStreamsWithFallback,
  getNonTranscodingStreams,
  resolveInitialStream,
  unsupportedCodecError,
} from '../../src/utils/streams';
import {
  AvailableStreams,
  ConnectionError,
  KnownCodec,
  Stream,
  TargetStream,
} from '../../src/types';

describe('getActualAvailableStreams', () => {
  it('should return undefined when mediaStreams is undefined', () => {
    expect(getActualAvailableStreams(undefined)).toBeUndefined();
  });

  it('should return undefined when mediaStreams is an empty array', () => {
    expect(getActualAvailableStreams([])).toBeUndefined();
  });

  it('should return encoder indices from streams', () => {
    const streams: Stream[] = [
      { codec: 27, encoderIndex: AvailableStreams.PRIMARY },
      { codec: 27, encoderIndex: AvailableStreams.SECONDARY },
    ];

    const result = getActualAvailableStreams(streams);

    expect(result).toEqual([
      AvailableStreams.PRIMARY,
      AvailableStreams.SECONDARY,
    ]);
  });

  it('should return a single stream when only one stream exists', () => {
    const streams: Stream[] = [
      { codec: 173, encoderIndex: AvailableStreams.PRIMARY },
    ];

    const result = getActualAvailableStreams(streams);

    expect(result).toEqual([AvailableStreams.PRIMARY]);
  });
});

describe('getNonTranscodingStreams', () => {
  it('should return undefined when mediaStreams is undefined', () => {
    expect(getNonTranscodingStreams(undefined)).toBeUndefined();
  });

  it('should return undefined when mediaStreams is empty', () => {
    expect(getNonTranscodingStreams([])).toBeUndefined();
  });

  it('should return both streams when both are H264', () => {
    const streams: Stream[] = [
      { codec: KnownCodec.H264, encoderIndex: AvailableStreams.PRIMARY },
      { codec: KnownCodec.H264, encoderIndex: AvailableStreams.SECONDARY },
    ];
    expect(getNonTranscodingStreams(streams)).toEqual([
      AvailableStreams.PRIMARY,
      AvailableStreams.SECONDARY,
    ]);
  });

  it('should filter out MJPEG secondary, keeping only H264 primary', () => {
    const streams: Stream[] = [
      { codec: KnownCodec.H264, encoderIndex: AvailableStreams.PRIMARY },
      { codec: KnownCodec.MJPEG, encoderIndex: AvailableStreams.SECONDARY },
    ];
    expect(getNonTranscodingStreams(streams)).toEqual([
      AvailableStreams.PRIMARY,
    ]);
  });

  it('should filter out MJPEG primary, keeping only H264 secondary', () => {
    const streams: Stream[] = [
      { codec: KnownCodec.MJPEG, encoderIndex: AvailableStreams.PRIMARY },
      { codec: KnownCodec.H264, encoderIndex: AvailableStreams.SECONDARY },
    ];
    expect(getNonTranscodingStreams(streams)).toEqual([
      AvailableStreams.SECONDARY,
    ]);
  });

  it('should return undefined when all streams require transcoding', () => {
    const streams: Stream[] = [
      { codec: KnownCodec.MJPEG, encoderIndex: AvailableStreams.PRIMARY },
      { codec: KnownCodec.MJPEG, encoderIndex: AvailableStreams.SECONDARY },
    ];
    expect(getNonTranscodingStreams(streams)).toBeUndefined();
  });

  it('should include H265 as a native codec', () => {
    const streams: Stream[] = [
      { codec: KnownCodec.H265, encoderIndex: AvailableStreams.PRIMARY },
      { codec: KnownCodec.MJPEG, encoderIndex: AvailableStreams.SECONDARY },
    ];
    expect(getNonTranscodingStreams(streams)).toEqual([
      AvailableStreams.PRIMARY,
    ]);
  });

  it('should return both when primary=H265 and secondary=H264', () => {
    const streams: Stream[] = [
      { codec: KnownCodec.H265, encoderIndex: AvailableStreams.PRIMARY },
      { codec: KnownCodec.H264, encoderIndex: AvailableStreams.SECONDARY },
    ];
    expect(getNonTranscodingStreams(streams)).toEqual([
      AvailableStreams.PRIMARY,
      AvailableStreams.SECONDARY,
    ]);
  });
});

describe('getActualAvailableStreamsWithFallback', () => {
  it('should return an empty array when mediaStreams is undefined', () => {
    expect(getActualAvailableStreamsWithFallback(undefined)).toEqual([]);
  });

  it('should return an empty array when mediaStreams is an empty array', () => {
    expect(getActualAvailableStreamsWithFallback([])).toEqual([]);
  });

  it('should return encoder indices from streams', () => {
    const streams: Stream[] = [
      { codec: 27, encoderIndex: AvailableStreams.PRIMARY },
      { codec: 27, encoderIndex: AvailableStreams.SECONDARY },
    ];

    const result = getActualAvailableStreamsWithFallback(streams);

    expect(result).toEqual([
      AvailableStreams.PRIMARY,
      AvailableStreams.SECONDARY,
    ]);
  });
});

describe('resolveInitialStream', () => {
  const both = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY];
  const streams = (primary: number, secondary: number): Stream[] => [
    { codec: primary, encoderIndex: AvailableStreams.PRIMARY },
    { codec: secondary, encoderIndex: AvailableStreams.SECONDARY },
  ];

  it.each([
    ['HIGH', TargetStream.HIGH, both, streams(KnownCodec.MJPEG, KnownCodec.H264), AvailableStreams.PRIMARY],
    ['HIGH without a primary', TargetStream.HIGH, [AvailableStreams.SECONDARY], undefined, AvailableStreams.SECONDARY],
    ['LOW', TargetStream.LOW, both, streams(KnownCodec.H264, KnownCodec.MJPEG), AvailableStreams.SECONDARY],
    ['LOW without a secondary', TargetStream.LOW, [AvailableStreams.PRIMARY], undefined, AvailableStreams.PRIMARY],
    ['AUTO, both native', TargetStream.AUTO, both, streams(KnownCodec.H264, KnownCodec.H264), AvailableStreams.SECONDARY],
    ['AUTO, MJPEG secondary', TargetStream.AUTO, both, streams(KnownCodec.H264, KnownCodec.MJPEG), AvailableStreams.PRIMARY],
    ['AUTO, all MJPEG', TargetStream.AUTO, both, streams(KnownCodec.MJPEG, KnownCodec.MJPEG), AvailableStreams.SECONDARY],
    ['AUTO, no codec data', undefined, both, undefined, AvailableStreams.SECONDARY],
  ])('%s', (_, target, available, mediaStreams, expected) => {
    expect(resolveInitialStream(target, available, mediaStreams)).toBe(expected);
  });
});

describe('unsupportedCodecError', () => {
  const streams: Stream[] = [
    { codec: KnownCodec.H264, encoderIndex: AvailableStreams.PRIMARY },
    { codec: KnownCodec.MJPEG, encoderIndex: AvailableStreams.SECONDARY },
    { codec: 0, encoderIndex: -1 as AvailableStreams },
  ];

  it('is null for a natively playable codec', () => {
    expect(unsupportedCodecError(AvailableStreams.PRIMARY, streams)).toBeNull();
    expect(
      unsupportedCodecError(AvailableStreams.PRIMARY, [
        { codec: KnownCodec.H265, encoderIndex: AvailableStreams.PRIMARY },
      ]),
    ).toBeNull();
  });

  it('reports MJPEG as mjpegDisabled', () => {
    expect(unsupportedCodecError(AvailableStreams.SECONDARY, streams)).toBe(
      ConnectionError.mjpegDisabled,
    );
  });

  it('reports any other codec that needs transcoding as transcodingDisabled', () => {
    expect(
      unsupportedCodecError(AvailableStreams.PRIMARY, [
        { codec: 12, encoderIndex: AvailableStreams.PRIMARY },
      ]),
    ).toBe(ConnectionError.transcodingDisabled);
  });

  it('is null when the codec is unknown', () => {
    expect(unsupportedCodecError(AvailableStreams.SECONDARY, undefined)).toBeNull();
    expect(
      unsupportedCodecError(AvailableStreams.SECONDARY, [
        { codec: KnownCodec.H264, encoderIndex: AvailableStreams.PRIMARY },
      ]),
    ).toBeNull();
    expect(
      unsupportedCodecError(AvailableStreams.PRIMARY, [
        { codec: 0, encoderIndex: AvailableStreams.PRIMARY },
      ]),
    ).toBeNull();
  });
});
