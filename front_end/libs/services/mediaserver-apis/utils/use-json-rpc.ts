import { catchError, first, forkJoin, map, Observable, race, retry, tap, timeout } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { nxConfig } from '@services/nx-config/config';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';

import { JsonRpcHandler, JsonRpcPayload, JsonRpcResponse } from '../connections/methods/json-rpc';

import { jsonRpcEnabled } from './json-rpc-enabled';

function parseUrlJsonRpcMethod(
    urlWithoutParams: string,
    httpMethod: 'list' | 'get' | 'post' | 'patch' | 'delete' = 'get',
): string {
    const methodLookup = {
        patch: 'update',
        post: 'create',
    };

    // const listSegment = '/*/';

    // if (urlWithoutParams.includes(listSegment)) {
    //     urlWithoutParams = urlWithoutParams.replace(listSegment, '/');
    //     httpMethod = 'list';
    // }

    return `${urlWithoutParams
        .split('/')
        .filter(val => !!val)
        .join('.')}.${methodLookup[httpMethod] || httpMethod}`;
}
function generateJsonRpcPayload<T>(
    url: string,
    params: T = {} as T,
    httpMethod: 'list' | 'get' | 'post' | 'patch' | 'delete' = 'get',
): JsonRpcPayload<unknown> {
    return { method: parseUrlJsonRpcMethod(url.split('?').shift(), httpMethod), params };
}

type executeCallback = (endpoint: string) => Observable<unknown>;

function mapAggregatedJsonRpcCalls(
    url: string,
    callback: executeCallback,
): Record<string, Observable<unknown>> {
    return url
        .split('?')
        .pop()
        .split('&')
        .reduce((acc, param) => {
            const [key, _value] = param.split('=');
            if (key === 'exec_cmd') {
                const endpoint = decodeURIComponent(_value);
                acc[endpoint] = callback(endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
            }
            return acc;
        }, {} as Record<string, Observable<unknown>>);
}

const excludedEndpoints = [
    'get',
    '/login/sessions',
    '/ec2/recordedTimePeriods',
    // '/api/aggregator'
];

const failingEndpoints = new Map<string, number>();

const handleResult = map((res: JsonRpcResponse) => {
    if ('error' in res) {
        throw Object.assign(new Error(), res.error);
    }

    return res.result;
});

/**
 * Used to report which is quicker between jsonRpcAggregate and ogAggregate.
 *
 * @param aggregateMethods - 'jsonRpcAggregate' | 'ogAggregate'
 * @param endpoint - string
 * @param start - number
 * @returns
 */
const reportWinner = (
    aggregateMethods: 'jsonRpcAggregate' | 'ogAggregate',
    endpoint: string,
    start: number,
): ReturnType<typeof tap> =>
    tap(() => {
        const end = performance.now();
        const time = end - start;
        // console.count(aggregateMethods);
        console.info(`Endpoint: ${decodeURIComponent(endpoint)} took ${Math.round(time)}ms`);
    });

type HttpMethods = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Used to decorate methods in NxSystemRestAPI2 to use JSON-RPC instead of HTTP.
 *
 * This bypasses the method completely and uses it only as a fallback. There's probably a little too much magic going on here but it's currently the best way without touching unrelated code.
 *
 * This will be refactored once mediaserver classes refactor is complete.
 * Will probably reuse this code but will instead include it as part of an adapter within libs/services/mediaserver-apis/connections/adapters.
 *
 * @param target - Currently only NxSystemRestAPI is supported. After mediaserver classes get refactored this should be updated to support a broader MediaserverRestConnection type.
 * @param key - Should only be used on 'get', 'post', 'put', 'patch', or 'delete' methods.
 * @param descriptor
 */
export function useJsonRpc(
    target: NxSystemRestAPI,
    key: HttpMethods,
    descriptor: PropertyDescriptor,
): void {
    const originalMethod = descriptor.value;
    descriptor.value = function (
        this: typeof target,
        ...args: Parameters<NxSystemRestAPI[typeof key]>
    ) {
        /**
         * Check if the feature flag is enabled and version supports JSON-RPC.
         *
         * Use JSON-RPC for all endpoints except the ones in excludedEndpoints.
         */
        if (
            jsonRpcEnabled(this) &&
            excludedEndpoints.every(endpoint => !args[0].includes(endpoint))
        ) {
            const endpoint = args[0];

            const handleError = catchError(err => {
                console.error(err);
                const failures = failingEndpoints.get(endpoint) || 0;
                failingEndpoints.set(endpoint, failures + 1);

                if (failures > 10) {
                    /**
                     * If the request fails 10 times in a row, the endpoint will be added to excludedEndpoints.
                     */
                    excludedEndpoints.push(endpoint);
                }

                return originalMethod.apply(this, args);
            });

            if (endpoint.includes('aggregator')) {
                /**
                 * This handles splitting up the commands to the aggregator endpoint to individual JSON-RPC commands.
                 *
                 * Currently we're using whichever returns first from JSON-RPC aggregator and original method.
                 *
                 * We'll remove the race with the original method once we're confident that JSON-RPC is quicker in this case.
                 */
                const start = performance.now();
                return race(
                    forkJoin(mapAggregatedJsonRpcCalls(endpoint, url => this.get(url)))
                        .pipe(
                            map(reply => ({ reply })),
                            handleError,
                        )
                        .pipe(reportWinner('jsonRpcAggregate', endpoint, start)),
                    originalMethod
                        .apply(this, args)
                        .pipe(reportWinner('ogAggregate', endpoint, start)),
                );
            }

            /**
             * Parse request to generate JSON-RPC payload.
             */
            const jsonRpcEndpoint = `${
                this.window.location.protocol === 'http' ? 'ws' : 'wss'
            }://${(this.urlBase || this.window.location.origin).split('://').pop()}/jsonrpc`;
            const connection = JsonRpcHandler.getConnection(jsonRpcEndpoint, () =>
                this.authGet && !nxConfig.featureFlags.restCookieLogin
                    ? `?auth=${this.authGet}`
                    : '',
            );
            const method = originalMethod.name === 'put' ? 'patch' : originalMethod.name;
            type GetArgs = Parameters<NxSystemRestAPI['get']>;
            type WithDataArgs = Parameters<NxSystemRestAPI['post' | 'put' | 'patch']>;
            type DeleteArgs = Parameters<NxSystemRestAPI['delete']>;
            let params: Record<string, unknown>;
            if (method === 'get') {
                params = (args as GetArgs)[1]?.params;
            } else if (['post', 'put', 'patch'].includes(method)) {
                const [_url, data, paramsToAdd] = args as WithDataArgs;
                params = { ...data, ...paramsToAdd };
            } else {
                params = (args as DeleteArgs)[1];
            }
            // const params = ['post', 'put', 'patch'].includes(method)
            //     ? { ...args[1], ...args[2] }
            //     : args[1];
            const payload = generateJsonRpcPayload(endpoint, params, method);
            const isGet = method === 'get';
            const timeoutMs = isGet ? 1000 : 2500;
            const retries = isGet ? 3 : 1;

            return connection.send({ jsonrpc: '2.0', id: uuid(), ...payload }).pipe(
                /**
                 * Timeout and retry are used to prevent the UI from hanging if there was some issue with the command.
                 *
                 * Timeout is set to 1 second for GET requests and 2.5 seconds for all other requests.
                 *
                 * Retry is set to 3 for GET requests and 1 for all other requests.
                 *
                 * This should handle if something terribly wrong. Websockets are susceptible to head of line blocking.
                 *
                 * If the request fails 10 times in a row, the endpoint will be added to excludedEndpoints.
                 */
                timeout(timeoutMs),
                retry(retries),
                handleResult,
                first(),
                handleError,
            );
        }
        return originalMethod.apply(this, args);
    };
}
