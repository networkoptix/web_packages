// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';
import {
  getActualAvailableStreams,
  getActualAvailableStreamsWithFallback,
  getNonTranscodingStreams,
} from '../../src/utils/streams';
import { AvailableStreams, KnownCodec, Stream } from '../../src/types';

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
