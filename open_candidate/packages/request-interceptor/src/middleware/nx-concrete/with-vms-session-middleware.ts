// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WithBearerMiddleware } from '../concrete/authentication';

/**
 * TODO: This is temporary to use with WithVmsSessionMiddleware.
 *
 * We should create a separate package for abstracting some behavior with the VMS client.
 */
class VmsClientApi {
    private sessionToken: Promise<string>;

    private vmsReady = false;

    public async hasToken(): Promise<boolean> {
        return this.vmsReady && Boolean(await this.sessionToken);
    }

    public async getSessionToken(): Promise<string> {
        if (!this.vmsReady) {
            return ''
        }
        // @ts-expect-error vms is a global variable
        const getToken = (): Promise<string> => window.vms?.auth?.sessionToken();
        this.sessionToken ||= getToken();
        return await this.sessionToken.catch(() => '');
    }

    constructor(vmsReadyCallback?: (clientInstance: VmsClientApi) => Promise<unknown>) {
        // @ts-expect-error vms is a global variable
        window.vmsApiInit = async () => {
            this.vmsReady = true;
            return await vmsReadyCallback?.(this);
        }
    }
}

export class WithVmsSessionMiddleware extends WithBearerMiddleware {
    /**
     * Initializes WithVmsSessionMiddleware with optional callbacks.
     *
     * The vmsTokenCallback is used if you wanted to use the VMS token elsewhere in your application.
     *
     * The shouldAuthenticate callback is used to determine if the request should be authenticated.
     *
     * Most likely would only authenticate certain routes.
     *
     * @param vmsTokenCallback - Callback to be called when the VMS token is available in case you want to use it.
     * @param shouldAuthenticate - Callback to determine if the request should be authenticated.
     */
    constructor(
        vmsTokenCallback?: (token: string) => unknown,
        shouldAuthenticate: (request?: Request) => boolean | Promise<boolean> = () => true
    ) {
        /**
         * Triggers the session token permission request when client is ready.
         */
        let token = Promise.resolve('')
        const client = new VmsClientApi(client => {
            token = client.getSessionToken();
            return token.then(vmsTokenCallback)
        });

        super(
            () => token,
            async (request: Request) => await client.hasToken() && await shouldAuthenticate(request)
        );
    }
}