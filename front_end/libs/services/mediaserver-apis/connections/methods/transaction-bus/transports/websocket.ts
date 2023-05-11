import { map, shareReplay } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { SystemBusMessage } from '../types/base/system-bus-message';

import { TransactionBusTransport } from './base';

export class WebSocketTransport extends TransactionBusTransport {
    static readonly #connections: Record<string, WebSocketSubject<SystemBusMessage>> = {};
    constructor(websocketUrl: string) {
        WebSocketTransport.#connections[websocketUrl] ||= webSocket<SystemBusMessage>(websocketUrl);
        super(
            WebSocketTransport.#connections[websocketUrl].asObservable().pipe(
                map(({ tran }) => tran),
                shareReplay({ bufferSize: 1, refCount: false }),
            ),
            (): void => {
                WebSocketTransport.#connections[websocketUrl].complete();
                delete WebSocketTransport.#connections[websocketUrl];
            },
        );
    }
}
