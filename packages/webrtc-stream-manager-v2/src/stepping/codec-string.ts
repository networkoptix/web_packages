// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// Codec-string resolution for the stepping pipeline.
//
// The session MIME is first-wins, so a mid-session codec change (re-sent init
// segment) leaves it stale — the new config's codec string must be derived
// from the decoder configuration record instead. AVC is exact; non-AVC
// families fall back to the (possibly stale) MIME.

/** Extract the `codecs="…"` token from an MSE MIME, e.g. `video/mp4; codecs="avc1.640028"`. */
export function parseCodecFromMime(mime: string | undefined): string | null {
  if (!mime) {
    return null;
  }
  return /codecs="([^"]+)"/.exec(mime)?.[1] ?? null;
}

/**
 * Build a WebCodecs codec string from an avcC payload (AVCDecoderConfigurationRecord):
 * bytes [1..3] = profile / compatibility / level ⇒ `<fourcc>.PPCCLL` lowercase hex
 * (e.g. `avc1.640028`). Returns null for non-AVC entries (hvcC has a different layout).
 */
export function avcCToCodecString(
  sampleEntry: string,
  decoderConfig: Uint8Array | null,
): string | null {
  if (sampleEntry !== 'avc1' && sampleEntry !== 'avc3') {
    return null;
  }
  if (!decoderConfig || decoderConfig.length < 4 || decoderConfig[0] !== 1) {
    return null;
  }
  const hex = (b: number): string => b.toString(16).padStart(2, '0');
  return `${sampleEntry}.${hex(decoderConfig[1])}${hex(decoderConfig[2])}${hex(decoderConfig[3])}`;
}
