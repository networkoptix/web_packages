// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import type { MediaFetchSession } from '../core/media-fetch-session';
import type { StreamManager } from '../core/stream-manager';
import { AvailableStreams, type WebRtcUrlConfig } from '../types';

export interface StepperSessionOptions {
  /** Archive stream to fetch (default PRIMARY — MSE delivers native quality). */
  stream?: AvailableStreams;
  /** Speed baked into the session at handshake (default 1). */
  speed?: number;
}

/**
 * Bind a {@link StreamManager} and {@link WebRtcUrlConfig} into the
 * `(positionMs) => MediaFetchSession` factory {@link BackfillFetcherConfig.openSession}
 * expects. Each call mints a fresh session for the {@link BackfillFetcher} to own.
 * Delivery is fixed to `'mse'` — stepping needs the encoded fMP4 on the data
 * channel, never an SRTP media track.
 */
export function createStepperOpenSession(
  manager: StreamManager,
  urlConfig: WebRtcUrlConfig,
  options: StepperSessionOptions = {},
): (positionMs: number) => MediaFetchSession {
  const stream = options.stream ?? AvailableStreams.PRIMARY;
  const speed = options.speed ?? 1;
  return (positionMs: number) =>
    manager.createFetchSession(urlConfig, {
      positionMs,
      deliveryMethod: 'mse',
      stream,
      speed,
    });
}
