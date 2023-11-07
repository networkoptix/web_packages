import { filter, Observable, switchMap, tap } from 'rxjs';

import { nxConfig } from '@services/nx-config/config';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';

import { TransactionBusHandler } from '../connections/methods/transaction-bus';
import { SystemBusTransaction } from '../connections/methods/transaction-bus/types/base/system-bus-transaction';

import { jsonRpcEnabled } from './json-rpc-enabled';

interface PredicateCallbackArgs {
    originalArgs: unknown;
    lastResponse: unknown;
    transaction: SystemBusTransaction;
}

export type PredicateCallback = ({
    originalArgs,
    lastResponse,
    transaction,
}: PredicateCallbackArgs) => boolean;

/**
 * A factory to create a decorator that will trigger updates for an endpoint based on a predicateCallback that filters based on system transactions.
 *
 * @param predicateFunction - A function used to filter the messages from the transaction bus.
 * @returns - Original method with the transaction bus updates.
 */
export function withSystemBusUpdates(predicateCallback: PredicateCallback) {
    return function withSystemBusUpdates<T = unknown>(
        target: NxSystemRestAPI,
        key: string,
        descriptor: PropertyDescriptor,
    ): void {
        const originalMethod: (...args: unknown[]) => Observable<T> = descriptor.value;

        descriptor.value = function (this: typeof target, ...originalArgs: unknown[]) {
            if (jsonRpcEnabled(this)) {
                const transactionBusEndpoint = `${
                    window.location.protocol === 'http' ? 'ws' : 'wss'
                }://${(this.urlBase || window.location.origin)
                    .split('://')
                    .pop()}/ec2/transactionBus/websocket?noInitialData=true`;
                const connection = TransactionBusHandler.getConnection(transactionBusEndpoint, () =>
                    this.authGet && !nxConfig.featureFlags.restCookieLogin
                        ? `&auth=${this.authGet}`
                        : '',
                );
                let lastResponse: T = null;

                return connection.state$.pipe(
                    filter(
                        transaction =>
                            !transaction ||
                            predicateCallback({ originalArgs, lastResponse, transaction }),
                    ),
                    switchMap(() => originalMethod.apply(this, originalArgs)),
                    tap((response: T) => {
                        lastResponse = response;
                    }),
                );
            }

            return originalMethod.apply(this, originalArgs);
        };
    };
}
