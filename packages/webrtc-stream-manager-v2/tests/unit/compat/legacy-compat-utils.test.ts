// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';
import {
  generateWebRtcUrlFactory,
  WithSkip,
  framesPerSecondFactory,
} from '../../../src/utils/legacy-compat';

describe('compat: legacy v1 utils', () => {
  describe('generateWebRtcUrlFactory', () => {
    it('builds a v2-endpoint URL for version >= 6.0', () => {
      const factory = generateWebRtcUrlFactory('relay.example.com', 'cam-1', 'server-1', 6.0);
      const url = factory({});
      expect(url).toContain('wss://relay.example.com/');
      expect(url).toContain('rest/v3/devices/cam-1/webrtc');
      expect(url).toContain('api=v2');
      expect(url).toContain('x-server-guid=server-1');
    });

    it('builds a v1-endpoint URL for version < 6.0', () => {
      const factory = generateWebRtcUrlFactory('relay.example.com', 'cam-1', 'server-1', 5.1);
      const url = factory({});
      expect(url).toContain('webrtc-tracker');
      expect(url).toContain('camera_id=cam-1');
    });
  });

  describe('WithSkip', () => {
    it('wraps a value with an optional skip flag', () => {
      const a = new WithSkip(42);
      expect(a.value).toBe(42);
      expect(a.skip).toBe(false);

      const b = new WithSkip('x', true);
      expect(b.value).toBe('x');
      expect(b.skip).toBe(true);
    });
  });

  describe('framesPerSecondFactory', () => {
    it('returns an Observable<number> (matches v1 signature)', () => {
      const fps$ = framesPerSecondFactory();
      expect(typeof fps$.subscribe).toBe('function');
    });
  });
});
