// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { AuthenticationMiddleware } from '../../abstract/authentication-middleware';

/**
 * The `WithBearerMiddleware` class is used to add a bearer token to the request.
 */

export class WithBearerMiddleware extends AuthenticationMiddleware {
    async authenticate(request: Request): Promise<void> {
        request.headers.set('authorization', `Bearer ${await this.getToken(request)}`);
    }

    /**
     * `WithBearerMiddleware` first checks a request with `shouldAuthenticate` to determine if a request can be authenticated.
     *
     * If the request can be authenticated, then `WithBearerMiddleware` will call `getToken` to get the token.
     *
     * @param getToken - Function that returns the token or a promise that resolves to the token.
     * @param shouldAuthenticate  - Function that returns a boolean or a promise that resolves to a boolean.
     */
    constructor(
        private getToken: (request?: Request) => string | Promise<string>,
        protected shouldAuthenticate: (request?: Request) => boolean | Promise<boolean>
    ) {
        super();
    }
}
