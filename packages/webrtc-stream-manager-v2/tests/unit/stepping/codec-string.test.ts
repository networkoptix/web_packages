// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';

import { avcCToCodecString, parseCodecFromMime } from '../../../src/stepping/codec-string';

describe('parseCodecFromMime', () => {
  it('extracts the codecs token from an MSE MIME', () => {
    expect(parseCodecFromMime('video/mp4; codecs="avc1.640028"')).toBe('avc1.640028');
    expect(parseCodecFromMime('video/mp4; codecs="hev1.1.6.L93.B0"')).toBe('hev1.1.6.L93.B0');
  });

  it('returns null when absent or unparseable', () => {
    expect(parseCodecFromMime(undefined)).toBeNull();
    expect(parseCodecFromMime('video/mp4')).toBeNull();
    expect(parseCodecFromMime('')).toBeNull();
  });
});

describe('avcCToCodecString', () => {
  it('builds avc1.PPCCLL from the AVCDecoderConfigurationRecord', () => {
    // configVersion=1, profile=0x64, compat=0x00, level=0x28 → avc1.640028.
    expect(avcCToCodecString('avc1', new Uint8Array([1, 0x64, 0x00, 0x28, 0xff, 0xe1])))
      .toBe('avc1.640028');
    // Lowercase, zero-padded hex; constrained-baseline example.
    expect(avcCToCodecString('avc1', new Uint8Array([1, 0x42, 0xc0, 0x1e])))
      .toBe('avc1.42c01e');
  });

  it('honours the avc3 sample entry prefix', () => {
    expect(avcCToCodecString('avc3', new Uint8Array([1, 0x64, 0x00, 0x33])))
      .toBe('avc3.640033');
  });

  it('returns null for non-AVC sample entries (hvcC has a different layout)', () => {
    expect(avcCToCodecString('hvc1', new Uint8Array([1, 0x64, 0x00, 0x28]))).toBeNull();
    expect(avcCToCodecString('hev1', new Uint8Array([1, 0x64, 0x00, 0x28]))).toBeNull();
  });

  it('returns null for a missing or malformed record', () => {
    expect(avcCToCodecString('avc1', null)).toBeNull();
    expect(avcCToCodecString('avc1', new Uint8Array([1, 0x64]))).toBeNull(); // too short
    expect(avcCToCodecString('avc1', new Uint8Array([0, 0x64, 0x00, 0x28]))).toBeNull(); // wrong version
  });
});
