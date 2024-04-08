import { EMPTY, from, Observable, ObservableInput, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ScopedTokenState } from '@utils/scoped-token-state';

import { FreshSeshConfig, WithFreshSession } from './nx-cloud-api.types';

export class TokenSessionManager {
    static INSTANCES: { [refreshTokenEndpoint: string]: TokenSessionManager } = {};

    tokenState: ScopedTokenState;

    handlerFactory =
        (logoutMethod?: () => unknown): ReturnType<WithFreshSession> =>
        <T>(observableInputFactory: (config: FreshSeshConfig) => ObservableInput<T>) =>
            from(this.tokenState.ensureFresh()).pipe(
                switchMap(cloudTokenState => cloudTokenState.accessToken),
                switchMap(accessToken =>
                    observableInputFactory({
                        accessToken,
                        getFreshAccessToken: (): Observable<string> =>
                            from(this.tokenState.ensureFresh()).pipe(
                                switchMap(scopedToken => scopedToken.accessToken),
                            ),
                    }),
                ),
                catchError(e => {
                    if (e instanceof SyntaxError) {
                        return EMPTY;
                    }
                    if (logoutMethod && e?.url.includes('/api/account/refreshAccessToken')) {
                        logoutMethod();
                    }
                    throw e;
                }),
            );

    getHandler = (logoutMethod?: () => unknown): ReturnType<WithFreshSession> =>
        this.handlerFactory(logoutMethod);

    static getInstance(refreshTokenEndpoint: string): TokenSessionManager['getHandler'] {
        if (!TokenSessionManager.INSTANCES[refreshTokenEndpoint]) {
            TokenSessionManager.INSTANCES[refreshTokenEndpoint] = new TokenSessionManager(
                refreshTokenEndpoint,
            );
        }

        return TokenSessionManager.INSTANCES[refreshTokenEndpoint].getHandler;
    }

    constructor(public refreshTokenEndpoint: string) {
        this.tokenState = ScopedTokenState.getInstance(refreshTokenEndpoint);
    }
}
