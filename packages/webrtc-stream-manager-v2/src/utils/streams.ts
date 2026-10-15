// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import {
  AvailableStreams,
  ConnectionError,
  KnownCodec,
  Stream,
  TargetStream,
  isNativeWebRtcCodec,
} from '../types';

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

/**
 * Determine which stream to connect first as the always-on base connection.
 *
 * Decision logic:
 * - Explicit HIGH → PRIMARY
 * - Explicit LOW → SECONDARY
 * - AUTO → cheapest non-transcoding stream as the persistent base:
 *   - SECONDARY if non-transcoding (cheap low-res base)
 *   - PRIMARY if SECONDARY requires transcoding
 *   - SECONDARY if all streams require transcoding (cheaper to transcode)
 */
export function resolveInitialStream(
  targetStream: TargetStream | undefined,
  availableStreams: AvailableStreams[],
  mediaStreams: Stream[] | undefined,
): AvailableStreams {
  if (targetStream === TargetStream.HIGH) {
    return availableStreams.includes(AvailableStreams.PRIMARY)
      ? AvailableStreams.PRIMARY
      : availableStreams[0];
  }
  if (targetStream === TargetStream.LOW) {
    return availableStreams.includes(AvailableStreams.SECONDARY)
      ? AvailableStreams.SECONDARY
      : availableStreams[0];
  }

  const nonTranscoding = getNonTranscodingStreams(mediaStreams);
  if (nonTranscoding?.includes(AvailableStreams.SECONDARY)) {
    return AvailableStreams.SECONDARY;
  }
  if (nonTranscoding?.length) {
    return nonTranscoding[0];
  }
  return availableStreams.includes(AvailableStreams.SECONDARY)
    ? AvailableStreams.SECONDARY
    : availableStreams[0];
}

/**
 * Error to report instead of playing `stream` when only server transcoding could deliver
 * its codec (the web client must not request it); `null` when native or unknown.
 */
export function unsupportedCodecError(
  stream: AvailableStreams,
  mediaStreams: Stream[] | undefined,
): ConnectionError | null {
  const codec = mediaStreams?.find((s) => s.encoderIndex === stream)?.codec;
  if (!codec || isNativeWebRtcCodec(codec)) return null;
  return codec === KnownCodec.MJPEG
    ? ConnectionError.mjpegDisabled
    : ConnectionError.transcodingDisabled;
}
