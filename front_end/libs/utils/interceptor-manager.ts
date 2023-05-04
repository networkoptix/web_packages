import {
    RequestInterceptor,
    WithBearerMiddleware,
    WithFirstMiddleware,
    WithVmsSessionMiddleware,
} from 'nx-open-web-candidate/packages/request-interceptor';

import { ScopedTokenState } from './scoped-token-state';

export class InterceptorManager {
    static INSTANCE: InterceptorManager;

    static USE_CLOUD_TOKEN = 'useCloudToken' as const;
    static USE_SYSTEM_TOKEN = 'useSystemToken' as const;

    static getInstance(accessToken = '', trafficRelayHost = ''): InterceptorManager {
        InterceptorManager.INSTANCE ||= new InterceptorManager(accessToken, trafficRelayHost);
        if (accessToken) {
            InterceptorManager.INSTANCE.scopedTokens.cloud.accessToken ||=
                Promise.resolve(accessToken);
        }

        if (trafficRelayHost) {
            InterceptorManager.INSTANCE.trafficRelayHost ||= trafficRelayHost;
        }

        return InterceptorManager.INSTANCE;
    }

    static enabled = false;

    get enabled(): boolean {
        return InterceptorManager.enabled;
    }

    set enabled(value: boolean) {
        InterceptorManager.enabled = value;
    }

    scopedTokens: Record<string, ScopedTokenState> = {
        cloud: ScopedTokenState.getInstance('/api/account/refreshAccessToken'),
    };

    minimumSession = 60 * 5; // 5 minutes

    public existingSessionCheck: Promise<boolean>;

    private async checkAndUpdateSession(
        target: ScopedTokenState = this.scopedTokens.cloud,
    ): Promise<ScopedTokenState> {
        return target.ensureFresh(this.minimumSession);
    }

    private async ensureFreshSession(canAuthenticate: boolean): Promise<boolean> {
        const updateSessionPromise = this.checkAndUpdateSession();

        if (!canAuthenticate) {
            // No need to wait for session update;
            return false;
        }
        await updateSessionPromise;

        return true;
    }

    private constructor(accessToken: string, public trafficRelayHost: string) {
        if (accessToken) {
            this.scopedTokens.cloud.accessToken = Promise.resolve(accessToken);
        }

        const shouldAuthenticateWithBearer = async (request?: Request): Promise<boolean> => {
            const canAuthenticate =
                InterceptorManager.enabled &&
                (await this.scopedTokens.cloud.accessToken) &&
                request.headers.get('authorization')?.includes(InterceptorManager.USE_CLOUD_TOKEN);
            return this.ensureFreshSession(canAuthenticate);
        };

        const getScope = (request: Request): string =>
            request.headers
                .get('authorization')
                .split(`${InterceptorManager.USE_SYSTEM_TOKEN}|`)
                .pop();

        const shouldAuthenticateWithScopedToken = async (request?: Request): Promise<boolean> =>
            InterceptorManager.enabled &&
            (await this.scopedTokens.cloud.accessToken) &&
            request.headers.get('authorization')?.includes(InterceptorManager.USE_SYSTEM_TOKEN);

        const useCloudToken = (): Promise<string> => this.scopedTokens.cloud.accessToken;

        const useSystemScopedToken = async (request: Request): Promise<string> => {
            const [scope, cookieLoginUrl] = getScope(request).split('|');
            this.scopedTokens[scope] ||= ScopedTokenState.getInstance(
                `/api/systems/${scope}/token`,
                cookieLoginUrl || '',
            );

            const target = await this.scopedTokens[scope];
            await this.checkAndUpdateSession(target);
            const { accessToken } = await this.scopedTokens[scope];
            return accessToken;
        };

        RequestInterceptor.register([
            new WithFirstMiddleware([
                new WithBearerMiddleware(useSystemScopedToken, shouldAuthenticateWithScopedToken),
                new WithBearerMiddleware(useCloudToken, shouldAuthenticateWithBearer),
                new WithVmsSessionMiddleware(
                    // eslint-disable-next-line camelcase
                    access_token => {
                        fetch('/api/account/loginTokens', {
                            method: 'POST',
                            headers: {
                                RequestInterceptorRequest: 'true',
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({ access_token }),
                            credentials: 'include',
                        }).then(() =>
                            // eslint-disable-next-line nx/ban-global-variables
                            window.location.reload(),
                        );
                    },
                    shouldAuthenticateWithBearer,
                    'cloudToken',
                ),
            ]),
        ]);
    }
}
