// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// Polyfill MediaStream for jsdom (not included in jsdom's WebRTC surface).
// CameraConnection creates a managed MediaStream in its field initializer,
// so this must be available before any production module is loaded.

if (typeof globalThis.MediaStream === 'undefined') {
  class MediaStreamPolyfill {
    private _tracks: MediaStreamTrack[] = [];

    getVideoTracks(): MediaStreamTrack[] {
      return this._tracks.filter((t) => t.kind === 'video');
    }

    getAudioTracks(): MediaStreamTrack[] {
      return this._tracks.filter((t) => t.kind === 'audio');
    }

    getTracks(): MediaStreamTrack[] {
      return [...this._tracks];
    }

    addTrack(track: MediaStreamTrack): void {
      if (!this._tracks.includes(track)) {
        this._tracks.push(track);
      }
    }

    removeTrack(track: MediaStreamTrack): void {
      this._tracks = this._tracks.filter((t) => t !== track);
    }
  }

  (globalThis as unknown as Record<string, unknown>).MediaStream =
    MediaStreamPolyfill;
}
