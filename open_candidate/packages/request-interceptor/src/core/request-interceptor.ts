// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { BatchInterceptor } from '@mswjs/interceptors'
import { RequestMiddleware } from './request-middleware'
import { interceptorKey, name } from './common'
import { interceptors } from './node'

/**
 * The `RequestInterceptor` class is used to intercept requests and responses and process them with the registered an array of `RequestMiddleware`.
 *
 * The `RequestInterceptor` class is isomorphic and will work in both the browser and server environments.
 *
 * To create your own middleware extend either `RequestMiddleware` or one of the other middleware abstract classes.
 *
 * The base `RequestMiddleware` class is more low level for more advanced use cases. The other middleware abstract classes are more high level to handle common use cases.
 *
 * Use the `register` static method to initialize `RequestInterceptor`.
 */
export class RequestInterceptor extends BatchInterceptor<typeof interceptors> {
    /**
     * Determines if the request has already been intercepted.
     *
     * @param request - Request
     * @returns - boolean
     */
    #intercepted = (request: Request): boolean => !!request.headers.get(interceptorKey);

    /**
     * Handles the response and passes it through the middleware.
     *
     * @param response - Response
     * @param request - Request
     */
    #handleResponse = async (response: Response, request: Request): Promise<void> => {
        // TODO: Add response handler once we have a use case for it.
    };

    /**
     * Handles the request and passes it through the middleware.
     *
     * @param request - Request
     * @returns - Promise<void>
     */
    #handleRequest = async (request: Parameters<Parameters<(typeof this)['on']>[1]>[0]): Promise<void> => {
        if (request instanceof Response || this.#intercepted(request)) {
            /**
             * Request has already been intercepted or is a response.
             *
             * For already intercepted requests, we don't want to intercept again.
             *
             * For responses, we don't want to intercept with this handler.
             */
            return;
        }

        let modifiedRequest: Request;

        for (const middleware of this.middleware) {
            const updated = await middleware.handleRequest(modifiedRequest || new Request(request));

            if (updated) {
                modifiedRequest = updated;
            }
        }

        if (modifiedRequest) {
            /**
             * If the request has been modified, we need to set the interceptor key to prevent infinite loops.
             *
             * We also need to respond with the modified request.
             */
            modifiedRequest.headers.set(interceptorKey, 'true');
            request.respondWith(await fetch(modifiedRequest));
        }
    };

    /**
     * Initializes the RequestInterceptor and registers with the middleware for processing requests/responses.
     *
     * This method should be called as early as possible in the application lifecycle.
     *
     * For most applications, this should be called early in the `main.ts` or `main.js` file or within your polyfills file.
     *
     * @param middleware - RequestMiddleware[]
     * @returns RequestInterceptor
     */
    static register(middleware: RequestMiddleware[]): RequestInterceptor {
        return new RequestInterceptor(middleware);
    }

    private constructor(
        private middleware: RequestMiddleware[]
    ) {
        super({
            name,
            interceptors,
        });

        /**
         * Apply the interceptor to the global scope.
         *
         * Registers handlers for the `request` and `response` events.
         */
        this.apply();
        this.on('request', this.#handleRequest);
        this.on('response', this.#handleResponse);
    }
}
