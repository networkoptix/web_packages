// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { RequestMiddleware, asyncFind } from "../../../core";
import { ProcessedRequest } from "../../../core/types";


/**
 * The WithFirstMiddleware is a higher order middleware that will process only the first middleware
 * that is able to handle the request. This is useful for things like grouping authentication.
 */
export class WithFirstMiddleware extends RequestMiddleware {
    /**
     * First middleware that is able to handle the request will be used.
     *
     * @param middlewares - The middlewares to process in order.
     */
    constructor(
        public middlewares: RequestMiddleware[]
    ) {
        super()
    }

    async handleRequest(request: Request): Promise<ProcessedRequest> {
        for (const middleware of this.middlewares) {
            const processedRequest = await middleware.handleRequest(request);
            if (processedRequest) {
                return processedRequest;
            }
        }
    }
}