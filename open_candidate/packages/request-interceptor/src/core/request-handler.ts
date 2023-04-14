// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { RequestMiddleware } from ".";

/**
 * Generic request handler.
 *
 * This is used to delegate handling of a request to a specific handler.
 *
 * Example usage would be to have handlers for routing.
 *
 * The first matching handler would be used to handle the request.
 *
 * In our example that handler would also probably be responsible for authenticating the request.
 */
export class RequestHandler {
    constructor(
        /**
         * Checks if this handler can handle the request.
         * @param request - Request
         * @returns - boolean or Promise<boolean>
         */
        public canHandle: (request: Request) => boolean | Promise<boolean>,
        /**
         * Return the request if it was modified.
         *
         * @param request - Request
         * @returns - ProcessedRequest or Promise<ProcessedRequest>
         */
        public handle: RequestMiddleware['handleRequest']
    ) { }
}
