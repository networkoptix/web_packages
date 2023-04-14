// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { ProcessedRequest } from '../../core/types';
import { RequestMiddleware } from '../../core/request-middleware';

/**
 * Base class for all authentication middleware.
 */
export abstract class AuthenticationMiddleware extends RequestMiddleware {
    /**
     * This checks if the request can be authenticated.
     *
     * Most likely this will check if the request is for a specific domain or path.
     *
     * @param request - Request
     */
    protected abstract shouldAuthenticate(request: Request): boolean | Promise<boolean>;

    /**
     * Handles authenticating the request.
     *
     * Most likely this will set the authorization header, a session cookie, or add a query param.
     *
     * @param request - Request
     */
    protected abstract authenticate(request: Request): void | Promise<void>;

    /**
     * TODO: Need to figure out if there's any common patterns for handling responses.
     *
     * Most likely we need to add another abstract method like authFailed that can be called if the authentication failed.
     *
     * @param response - Response
     * @param request - Request
     */
    async handleResponse(response: Response, request: Request): Promise<void> { }

    async handleRequest(request: Request): Promise<ProcessedRequest> {
        if (await this.shouldAuthenticate(request)) {
            await this.authenticate(request);
            return request;
        }
    }
}
