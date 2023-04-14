// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { asyncFind, RequestMiddleware } from "../../core";
import { ProcessedRequest } from "../../core/types";
import { RequestHandler } from "../../core";

/**
 * Base class for all routing middleware.
 */
export abstract class RoutingGroupMiddleware extends RequestMiddleware {

    /**
     * Routing handlers. These are checked in order until one matches.
     *
     * First matching handler will be used to handle the request.
     */
    abstract routingHandlers: RequestHandler[];

    /**
     * TODO: Need to figure out if there's any common patterns for handling responses.
     *
     * Most likely reason would be to update the response to make it opaque and hide the changes made by the middleware.
     *
     * @param response - Response
     * @param request - Request
     */
    async handleResponse(response: Response, request: Request): Promise<void> { }

    /**
     * Handles the request using the first matching handler if one is found.
     *
     * @param request - Request
     * @returns - Promise<ProcessedRequest>
     */
    async handleRequest(request: Request): Promise<ProcessedRequest> {
        const firstMatchingHandler = await asyncFind(
            this.routingHandlers,
            async (handler) => handler.canHandle(request)
        );

        if (firstMatchingHandler) {
            return firstMatchingHandler.handle(request);
        }
    }
}