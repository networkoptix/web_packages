import { from, Observable, ObservableInput, switchMap } from 'rxjs';

import { ScopedTokenState } from '@utils/scoped-token-state';

import { FreshSeshConfig, WithFreshSession } from './nx-cloud-api.types';

export class TokenSessionManager {
    static INSTANCES: { [refreshTokenEndpoint: string]: TokenSessionManager } = {};

    tokenState: ScopedTokenState;

    handlerFactory = (
        minSessionSeconds: number
    ): ReturnType<WithFreshSession> => <T>(
        observableInputFactory: (config: FreshSeshConfig) => ObservableInput<T>
    ) => from(
            this.tokenState.ensureFresh(minSessionSeconds)
        ).pipe(
            switchMap(cloudTokenState => cloudTokenState.accessToken),
            switchMap(accessToken => observableInputFactory({
                accessToken,
                getFreshAccessToken: (): Observable<string> => from(this.tokenState.ensureFresh()).pipe(switchMap(scopedToken => scopedToken.accessToken))
            })),
        );

    getHandler = (minSessionSeconds: number = 300): ReturnType<WithFreshSession> => this.handlerFactory(minSessionSeconds);

    static getInstance(refreshTokenEndpoint: string): TokenSessionManager['getHandler'] {
        if (!TokenSessionManager.INSTANCES[refreshTokenEndpoint]) {
            TokenSessionManager.INSTANCES[refreshTokenEndpoint] = new TokenSessionManager(refreshTokenEndpoint);
        }

        return TokenSessionManager.INSTANCES[refreshTokenEndpoint].getHandler;
    }

    constructor(
        public refreshTokenEndpoint: string
    ) {
        this.tokenState = ScopedTokenState.getInstance(refreshTokenEndpoint);
    }
}
