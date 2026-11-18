// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { KnownCodec } from '../types';

/**
 * Type-guard that checks whether a numeric codec value represents H265/HEVC.
 *
 * @param codec - The codec identifier to test.
 * @returns `true` when `codec` equals {@link KnownCodec.H265} (173).
 */
export function isH265Codec(codec: number): boolean {
  return codec === KnownCodec.H265;
}

/**
 * Check whether a codec requires MSE delivery because it cannot be transported via SRTP.
 *
 * Currently only H265 may require MSE: the mediaserver's `webrtcSrtpTransportEnableH265`
 * flag is off by default, and even when on, not all browsers decode H265 via WebRTC.
 * This function conservatively returns true for H265 when the browser lacks SRTP H265
 * support — callers should try SRTP first and use the reactive transcoding fallback
 * as a safety net.
 */
export function codecRequiresMse(codec: number): boolean {
  return isH265Codec(codec) && !browserSupportsH265WebRTC();
}

/**
 * Check whether the browser supports the MediaSource Extensions API.
 * Required for MSE delivery mode.
 */
export function isMseSupported(): boolean {
  return (
    typeof MediaSource !== 'undefined' &&
    typeof MediaSource.isTypeSupported === 'function'
  );
}

/**
 * Cached result of browserSupportsH265WebRTC(). Browser codec capabilities
 * don't change during a session, so we only need to scan once.
 */
let _h265WebRTCSupport: boolean | undefined;

/**
 * Check whether the browser can decode H265/HEVC via WebRTC SRTP transport.
 *
 * Uses `RTCRtpReceiver.getCapabilities('video')` to check for H265 codec support.
 * Returns false if the API is unavailable or H265 is not listed.
 *
 * Result is memoized — codec capabilities do not change within a session.
 */
export function browserSupportsH265WebRTC(): boolean {
  if (_h265WebRTCSupport !== undefined) return _h265WebRTCSupport;

  if (
    typeof RTCRtpReceiver === 'undefined' ||
    typeof RTCRtpReceiver.getCapabilities !== 'function'
  ) {
    _h265WebRTCSupport = false;
    return false;
  }

  const capabilities = RTCRtpReceiver.getCapabilities('video');
  if (!capabilities) {
    _h265WebRTCSupport = false;
    return false;
  }

  _h265WebRTCSupport = capabilities.codecs.some(
    (c) =>
      c.mimeType.toLowerCase() === 'video/h265' ||
      c.mimeType.toLowerCase() === 'video/hevc',
  );
  return _h265WebRTCSupport;
}

/**
 * Reset the memoized H265 WebRTC support cache.
 * Exposed for testing only — browser capabilities don't change at runtime.
 * @internal
 */
export function _resetH265Cache(): void {
  _h265WebRTCSupport = undefined;
}

/**
 * Whether an SDP offer delivers video in a codec that only the server transcoder outputs.
 *
 * The mediaserver passes H264 and H265 through over SRTP; any other video codec in its
 * offer (typically VP8) is transcoder output. CLOUD-18468: this is the only sign of
 * transcoding for a camera whose own codec is native, e.g. a stitched panoramic camera.
 *
 * @returns `false` when the offer has no video section or names no video codec.
 */
export function sdpOffersTranscodedVideo(sdp: string | undefined): boolean {
  if (!sdp) return false;
  const videoCodecs = sdp
    .split(/^m=/m)
    .filter((section) => section.startsWith('video'))
    .flatMap((section) => [...section.matchAll(/^a=rtpmap:\d+ ([^/\s]+)/gm)])
    .map((match) => match[1].toUpperCase());
  return videoCodecs.length > 0 && !videoCodecs.some((codec) => codec === 'H264' || codec === 'H265');
}

/**
 * Extract the mime type of the video codec actually being delivered from an
 * RTCStatsReport: the `inbound-rtp` video report's `codecId` points at the
 * `codec` report holding the negotiated mime (e.g. `video/H264`).
 *
 * Unlike the camera's mediaStreams config this reflects the played media, so
 * it stays correct for archive chunks recorded with a different codec.
 *
 * @returns The codec mime type, or `''` when it cannot be determined.
 */
export function extractPlayingCodecMime(stats: RTCStatsReport): string {
  let codecId = '';
  const codecMimes = new Map<string, string>();

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && (report as { kind?: string }).kind === 'video') {
      codecId = (report as { codecId?: string }).codecId ?? '';
    }
    if (report.type === 'codec') {
      codecMimes.set(report.id, (report as { mimeType?: string }).mimeType ?? '');
    }
  });

  return (codecId && codecMimes.get(codecId)) || '';
}
