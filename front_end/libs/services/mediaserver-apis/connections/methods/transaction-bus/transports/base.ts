import { Observable } from 'rxjs';

import { SystemTransaction } from '../types';

/**
 * An abstract class that defines the interface for a TransactionBusTransport.
 */
export abstract class TransactionBusTransport {
    constructor(
        public state$: Observable<SystemTransaction>,
        public close: () => void
    ) { }
}

export interface TransactionBusTransportConstructor<T = TransactionBusTransport> {
    new(url: string): T;
}
