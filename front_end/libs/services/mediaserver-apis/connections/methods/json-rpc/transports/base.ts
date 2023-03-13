import { Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { HandlerState, JsonRpcMessage, JsonRpcRequest } from '../types';

/**
 * An abstract class that defines the interface for a JsonRpcMessageTransport and also handles some shared behavior.
 */
export abstract class JsonRpcMessageTransport {
    /**
     * Stream of messages received from the server.
     */
    public state$: HandlerState;

    /**
     * Send a message to the server.
     *
     * Returns filtered stream of related messages from the server.
     */
    public send: (message: JsonRpcRequest) => Observable<JsonRpcMessage<unknown, unknown>>;

    /**
     * Close the connection.
     */
    public close: () => void;

    /**
     * Endsures that a message has an id. So that responses can be matched to the request.
     *
     * @param send - Send Handler
     * @returns HandlerState
     */
    #withId = (send: (message: JsonRpcRequest) => HandlerState) => (message: JsonRpcRequest) => {
        message.id ||= uuid();
        return send(message);
    };

    /**
     * Creates a JsonRpcMessageTransport instance based on another MessageTransport instance.
     *
     * @param handler - A JsonRpcMessageTransport instance.
     */
    constructor(handler: JsonRpcMessageTransport);
    /**
     * Creates a JsonRpcMessageTransport instance by passing in the state and handlers.
     *
     * @param state$
     * @param send
     * @param close
     */
    constructor(state$: HandlerState, send: (message: JsonRpcRequest) => HandlerState, close: () => void);
    constructor(
        stateOrHandler: HandlerState | JsonRpcMessageTransport,
        send?: (message: JsonRpcRequest) => HandlerState,
        close?: () => void,
    ) {
        if (stateOrHandler instanceof Observable) {
            this.state$ = stateOrHandler;
            this.send = this.#withId(send);
            this.close = close;
        } else {
            const { state$, send, close } = stateOrHandler;
            this.state$ = state$;
            this.send = this.#withId(send);
            this.close = close;
        }
    }
}

/**
 * Type definition for a JsonRpcMessageTransport constructor.
 */
export interface JsonRpcMessageTransportConstructor<T = JsonRpcMessageTransport> {
    new(url: string): T;
}
