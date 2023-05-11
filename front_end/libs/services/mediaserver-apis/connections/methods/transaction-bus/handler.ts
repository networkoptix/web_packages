import { startWith } from 'rxjs';

import { WebSocketTransport } from './transports';
import { TransactionBusTransport, TransactionBusTransportConstructor } from './transports/base';

export class TransactionBusHandler extends TransactionBusTransport {
    static readonly #handlers: Record<string, TransactionBusHandler> = {};

    static disconnectOthers(TransactionBusHandler: TransactionBusHandler): void;
    static disconnectOthers(endpoint: string): void;
    static disconnectOthers(endpointOrHandler: string | TransactionBusHandler): void {
        Object.entries(TransactionBusHandler.#handlers).forEach(([url, handler]) => {
            const shouldDisconnect =
                endpointOrHandler instanceof TransactionBusHandler
                    ? handler !== endpointOrHandler
                    : url !== endpointOrHandler;
            if (shouldDisconnect) {
                handler.close();
            }
        });
    }

    static getConnection(
        transactionBusEndpoint: string,
        getAuth?: () => string | void,
        TransportClass: TransactionBusTransportConstructor = WebSocketTransport,
    ): TransactionBusHandler {
        TransactionBusHandler.#handlers[transactionBusEndpoint] ||= new TransactionBusHandler(
            new TransportClass(transactionBusEndpoint + (getAuth?.() || '')),
        );
        return TransactionBusHandler.#handlers[transactionBusEndpoint];
    }

    private constructor(transportHandler: TransactionBusTransport) {
        super(transportHandler.state$.pipe(startWith(null)), transportHandler.close);
    }
}
