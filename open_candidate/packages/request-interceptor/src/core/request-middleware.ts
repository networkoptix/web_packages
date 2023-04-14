// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { ProcessedRequest } from './types';

/**
 * Base class for all middleware.
 *
 * The `RequestMiddleware` class is used for creating custom middleware when there isn't an appropriate middleware abstract class.
 *
 * For most use cases, you should extend one of the other middleware abstract classes.
 *
 */

export abstract class RequestMiddleware {
    /**
     * Processes request.
     *
     * @param request - Request
     */
    handleRequest(request: Request): ProcessedRequest | Promise<ProcessedRequest> { }

    /**
     * Proceses response.
     *
     * @param response - Response
     * @param request - Request
     */
    handleResponse(response: Response, request: Request): void | Promise<void> { }
}
