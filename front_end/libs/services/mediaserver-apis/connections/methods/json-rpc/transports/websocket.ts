import { shareReplay, Observable, filter } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

import { JsonRpcMessage, JsonRpcRequest } from '../types';

import { JsonRpcMessageTransport } from './base';

/**
 * A transport that uses a WebSocket connection to send and receive JSON-RPC messages.
 *
 * We might want a higher level abstraction opens and delegates between multiple open WebSocket connections.
 *
 * Currently we open a single connection. Since WebSockets are susceptible to head of line blocking we have to handle the connection getting stalled when we use this transport.
 *
 * We could just open a bunch of websocket connections and delagate only to connections that aren't stalled but are limited because of the number of open connections we can have to a single domain, 6 with chrome.
 *
 * TODO: Future
 * What the eventual solution when using websocket will probably be to have a pool of 3 or 4 connections and delegate to the first connection that isn't stalled.
 * Whenever a connection stalls it requeues its open messages that can get delegated to other connections.
 *
 * Other ideas:
 * The JSON-RPC might benefit from using WebRTC datachannels instead of WebSockets.
 * WebRTC datachannels also don't have the same head of line blocking issue or connection limits as WebSockets.
 * WebRtc is also peer to peer so latency could be a lot better.
 *
 * We can also take advantage of WebRTC's bufffer thresholds. See https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/bufferedAmountLowThreshold#example
 * The idea would be that we create a pool of WebRTC connections to all online servers. All messages will be sent/received from a queue.
 * Each connection will pull from the queue on the onbufferedamountlow callback is called by the connection
 * If the queue is empty when the callback is called the connection will add itself to a list of connections that are waiting for messages.
 * Whenever a message is added to the queue and there are connections waiting for messages the message will be sent to the first connection in the list and that connection will be removed from the pool.
 */
export class WebSocketTransport extends JsonRpcMessageTransport {
    static readonly #connections: Record<string, WebSocketSubject<JsonRpcMessage>> = {};

    constructor(websocketUrl: string) {
        WebSocketTransport.#connections[websocketUrl] ||= webSocket<JsonRpcMessage>(websocketUrl);
        const state$ = WebSocketTransport.#connections[websocketUrl]
            .asObservable()
            .pipe(shareReplay({ bufferSize: 1, refCount: false }));
        const send = (message: JsonRpcRequest): Observable<JsonRpcMessage<unknown, unknown>> => {
            WebSocketTransport.#connections[websocketUrl].next(message);
            return state$.pipe(filter(({ id }) => id === message.id));
        };
        const close = (): void => {
            WebSocketTransport.#connections[websocketUrl].complete();
            delete WebSocketTransport.#connections[websocketUrl];
        };
        super(state$, send, close);
    }
}
