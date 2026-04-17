// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { AvailableStreams, Stream, isNativeWebRtcCodec } from '../types';

/**
 * Determines actual available streams from camera mediaStreams data.
 *
 * This utility provides a unified way to detect stream availability,
 * preventing attempts to connect to non-existent streams on single-stream cameras.
 *
 * @param mediaStreams - Array of Stream objects from camera parameters.
 * @returns Array of available stream indices, or `undefined` when detection
 *          should be delegated to the API (no data available).
 */
export function getActualAvailableStreams(
  mediaStreams: Stream[] | undefined,
): AvailableStreams[] | undefined {
  if (!mediaStreams?.length) return undefined;
  return mediaStreams.map((s) => s.encoderIndex);
}

/**
 * Determines available streams with a guaranteed non-undefined result.
 *
 * Falls back to an empty array when no stream data is available, rather than
 * returning `undefined`. Use this variant when a caller always needs a
 * concrete array to iterate over.
 *
 * @param mediaStreams - Array of Stream objects from camera parameters.
 * @returns Array of available stream indices (empty array if no data).
 */
export function getActualAvailableStreamsWithFallback(
  mediaStreams: Stream[] | undefined,
): AvailableStreams[] {
  return getActualAvailableStreams(mediaStreams) ?? [];
}

/**
 * Filter mediaStreams to only include streams whose codec won't trigger transcoding.
 * Each stream is checked individually — a device can have H264 on primary and MJPEG
 * on secondary (or vice versa).
 *
 * @param mediaStreams - Array of Stream objects from camera parameters.
 * @returns Array of stream indices that can be delivered without transcoding,
 *          or `undefined` when no mediaStreams data is available.
 */
export function getNonTranscodingStreams(
  mediaStreams: Stream[] | undefined,
): AvailableStreams[] | undefined {
  if (!mediaStreams?.length) return undefined;
  const native = mediaStreams
    .filter((s) => isNativeWebRtcCodec(s.codec))
    .map((s) => s.encoderIndex);
  return native.length > 0 ? native : undefined;
}
