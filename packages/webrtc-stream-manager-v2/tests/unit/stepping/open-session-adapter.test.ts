// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi } from 'vitest';

import type { MediaFetchSession } from '../../../src/core/media-fetch-session';
import type { StreamManager } from '../../../src/core/stream-manager';
import { createStepperOpenSession } from '../../../src/stepping/open-session-adapter';
import { AvailableStreams, type WebRtcUrlConfig } from '../../../src/types';

const URL_CONFIG = { systemId: 'sys', cameraId: 'cam' } as unknown as WebRtcUrlConfig;

function makeManager(): {
  manager: StreamManager;
  createFetchSession: ReturnType<typeof vi.fn>;
  session: MediaFetchSession;
} {
  const session = {} as MediaFetchSession;
  const createFetchSession = vi.fn().mockReturnValue(session);
  const manager = { createFetchSession } as unknown as StreamManager;
  return { manager, createFetchSession, session };
}

describe('createStepperOpenSession', () => {
  it('mints an MSE fetch session at the requested position with PRIMARY/1x defaults', () => {
    const { manager, createFetchSession, session } = makeManager();

    const openSession = createStepperOpenSession(manager, URL_CONFIG);
    const result = openSession(1_717_000_000_000);

    expect(result).toBe(session);
    expect(createFetchSession).toHaveBeenCalledWith(URL_CONFIG, {
      positionMs: 1_717_000_000_000,
      deliveryMethod: 'mse',
      stream: AvailableStreams.PRIMARY,
      speed: 1,
    });
  });

  it('honours stream and speed overrides', () => {
    const { manager, createFetchSession } = makeManager();

    const openSession = createStepperOpenSession(manager, URL_CONFIG, {
      stream: AvailableStreams.SECONDARY,
      speed: 2,
    });
    openSession(42);

    expect(createFetchSession).toHaveBeenCalledWith(URL_CONFIG, {
      positionMs: 42,
      deliveryMethod: 'mse',
      stream: AvailableStreams.SECONDARY,
      speed: 2,
    });
  });

  it('a per-call speed wins over the option default (per-mode fetch sessions)', () => {
    const { manager, createFetchSession } = makeManager();

    const openSession = createStepperOpenSession(manager, URL_CONFIG, { speed: 1 });
    openSession(42, 4);

    expect(createFetchSession.mock.calls[0][1].speed).toBe(4);
  });

  it('mints a fresh session per call (no caching) so the fetcher owns each lifecycle', () => {
    const { manager, createFetchSession } = makeManager();

    const openSession = createStepperOpenSession(manager, URL_CONFIG);
    openSession(100);
    openSession(200);

    expect(createFetchSession).toHaveBeenCalledTimes(2);
    expect(createFetchSession.mock.calls[0][1].positionMs).toBe(100);
    expect(createFetchSession.mock.calls[1][1].positionMs).toBe(200);
  });
});
