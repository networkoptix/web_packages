import { Observable } from 'rxjs';

import { SystemBusTransaction } from '../types/base/system-bus-transaction';

/**
 * An abstract class that defines the interface for a TransactionBusTransport.
 */
export abstract class TransactionBusTransport {
    constructor(
        public state$: Observable<SystemBusTransaction>,
        public close: () => void
    ) { }
}

export interface TransactionBusTransportConstructor<T = TransactionBusTransport> {
    new(url: string): T;
}
