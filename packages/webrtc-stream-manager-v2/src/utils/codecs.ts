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
