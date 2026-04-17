// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from './disposable';
import { diagTracker } from '../utils/diag-tracker';
import type { Logger } from '../types';

/**
 * Events emitted by {@link SignalingChannel}.
 *
 * - `message` -- a parsed JSON payload received from the remote peer.
 * - `error`   -- the underlying WebSocket encountered an error.
 * - `close`   -- the underlying WebSocket was closed.
 */
export type SignalingEvent = 'message' | 'error' | 'close';

type SignalingListener<E extends SignalingEvent> = E extends 'message'
  ? (data: unknown) => void
  : () => void;

/**
 * Encapsulates a WebSocket used for SDP / ICE signaling.
 *
 * The channel automatically closes the WebSocket when {@link dispose} is
 * called or when the optional `parentSignal` aborts.  Incoming JSON messages
 * are parsed and re-dispatched through a type-safe {@link on} listener API.
 */
export class SignalingChannel extends Disposable {
  private readonly ws: WebSocket;
  private readonly emitter = new EventTarget();

  /** @internal Diagnostic start time. */
  private readonly _diagStart: number;
  private readonly _diagLabel: string;
  /** @internal Connection key extracted from URL for diag tracker. */
  private readonly _diagConnectionKey: string;
  /** @internal Optional logger; off by default (consumer opts in). */
  private readonly logger?: Logger;

  constructor(url: string, parentSignal?: AbortSignal, logger?: Logger) {
    super();
    this.logger = logger;
    this._diagStart = performance.now();
    const _diagUrlShort = url.replace(/.*\/devices\//, '').replace(/\/webrtc.*/, '').slice(0, 12);
    this._diagLabel = `[WEBRTC-DIAG] [ws:${_diagUrlShort}]`;
    // Extract systemId:cameraId from URL for diag tracker lookups.
    // URL format: wss://{host}/rest/v3/devices/{cameraId}/webrtc?...x-server-guid=...&stream=...
    // Connection key is "{systemId}:{cameraId}" but we only have cameraId in URL.
    // We'll extract the cameraId and match by suffix in the tracker.
    this._diagConnectionKey = this.extractConnectionKey(url);
    this.logger?.info?.(`${this._diagLabel} SignalingChannel constructor`, { url, t: this._diagStart });

    this.ws = new WebSocket(url);

    this.ws.addEventListener('open', () => {
      this.logger?.info?.(`${this._diagLabel} WebSocket OPEN`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      diagTracker.milestone(this._diagConnectionKey, 'wsOpenMs');
    });

    // Forward WebSocket events through the internal emitter.
    this.ws.addEventListener('message', (event: Event) => {
      const msgEvent = event as MessageEvent;
      this.logger?.info?.(`${this._diagLabel} WebSocket message received`, { dataLength: typeof msgEvent.data === 'string' ? msgEvent.data.length : 'binary', elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      try {
        const parsed: unknown = JSON.parse(msgEvent.data as string);
        this.emitter.dispatchEvent(
          new CustomEvent('message', { detail: parsed }),
        );
      } catch {
        // Unparsable messages are silently dropped; the consumer can listen
        // for 'error' events on the underlying socket for transport errors.
      }
    });

    this.ws.addEventListener('error', () => {
      this.logger?.info?.(`${this._diagLabel} WebSocket ERROR`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      this.emitter.dispatchEvent(new Event('error'));
    });

    this.ws.addEventListener('close', () => {
      this.logger?.info?.(`${this._diagLabel} WebSocket CLOSE`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      this.emitter.dispatchEvent(new Event('close'));
    });

    // Register cleanup to close the WebSocket when the Disposable is disposed.
    this.onDispose(() => {
      this.ws.close();
    });

    // Link to an optional parent signal so that aborting it cascades disposal.
    if (parentSignal) {
      this.linkTo(parentSignal);
    }
  }

  /** @internal Extract connection key from signaling URL for diag tracker. */
  private extractConnectionKey(url: string): string {
    try {
      const u = new URL(url);
      // Extract cameraId from path: /rest/v3/devices/{cameraId}/webrtc
      const match = u.pathname.match(/\/devices\/([^/]+)\/webrtc/);
      const cameraId = match?.[1] ?? 'unknown';
      // Extract systemId from x-server-guid or the host prefix
      const serverGuid = u.searchParams.get('x-server-guid');
      // Match against all active timelines by cameraId suffix
      for (const [key] of diagTracker.raw) {
        if (key.endsWith(`:${cameraId}`)) return key;
      }
      return serverGuid ? `${serverGuid}:${cameraId}` : cameraId;
    } catch {
      return 'unknown';
    }
  }

  /**
   * JSON-stringify `message` and send it over the WebSocket.
   */
  send(message: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.logger?.info?.(`${this._diagLabel} WebSocket send`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Register a listener for the given signaling event.
   *
   * Returns a cleanup function that removes the listener.
   */
  on<E extends SignalingEvent>(
    event: E,
    listener: SignalingListener<E>,
  ): () => void {
    const handler = (evt: Event) => {
      if (event === 'message') {
        (listener as SignalingListener<'message'>)(
          (evt as CustomEvent).detail,
        );
      } else {
        (listener as SignalingListener<'error'>)();
      }
    };

    this.emitter.addEventListener(event, handler);
    return () => this.emitter.removeEventListener(event, handler);
  }
}
