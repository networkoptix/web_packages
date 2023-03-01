import { JsonRpcMessageTransport, JsonRpcMessageTransportConstructor, WebSocketTransport } from './transports';

/**
 * JsonRpcHandler is a wrapper around a JsonRpcMessageTransport that handles sending/receiving messages using the jsonRpc protocol.
 *
 * Defaults to using a WebSocketTransport for the connection but could be composed to use other transports.
 */
export class JsonRpcHandler extends JsonRpcMessageTransport {
    /**
     * Keep references to all JsonRpcHandler instances.
     */
    static readonly #handlers: Record<string, JsonRpcHandler> = {};

    /**
     * Disconnects all connections except the one to the given endpoint.
     *
     * @param jsonRpcEndpoint - The jsonRpcEndpoint endpoint to keep open.
     */
    static disconnectOthers(jsonRpcEndpoint: string): void;
    /**
     * Disconnects all connections except the one for the given handler.
     *
     * @param jsonRpcHandler - The handler instance to keep open
     */
    static disconnectOthers(jsonRpcHandler: JsonRpcHandler): void;
    static disconnectOthers(endpointOrHandler: string | JsonRpcHandler): void {
        Object.entries(JsonRpcHandler.#handlers).forEach(([url, handler]) => {
            const shouldDisconnect = endpointOrHandler instanceof JsonRpcHandler ? handler !== endpointOrHandler : url !== endpointOrHandler;
            if (shouldDisconnect) {
                handler.close();
            }
        });
    }

    /**
     * Get a JsonRpcHandler instance for a given jsonRpc endpoint.
     *
     * @param jsonRpcEndpoint - The endpoint to connect to. Should be compatible with the transport class.
     * @param getAuth - A function to either handle setting a cookie or returning a string to be appended to the endpoint.
     * @param TransportClass - A JsonRpcMessageTransport class to use for the connection. Defaults to WebSocketTransport.
     * @returns
     */
    static getConnection(jsonRpcEndpoint: string, getAuth?: () => string | void, TransportClass: JsonRpcMessageTransportConstructor = WebSocketTransport): JsonRpcHandler {
        JsonRpcHandler.#handlers[jsonRpcEndpoint] ||= new JsonRpcHandler(
            new TransportClass(jsonRpcEndpoint + (getAuth?.() || ''))
        );
        return JsonRpcHandler.#handlers[jsonRpcEndpoint];
    }

    /**
     * Use the getConnection method to get a JsonRpcHandler instance.
     */
    private constructor(transportHandler: JsonRpcMessageTransport) {
        super(transportHandler);
    }
}
