import { BroadcastChannel } from 'broadcast-channel';

export const getCsrf = (): string =>
    document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken'))
        ?.split('=')
        .pop();

export class ScopedTokenState {
    tokenBc: BroadcastChannel;
    accessToken?: Promise<string>;
    expiresAt?: Promise<number>;

    initialSync: Promise<unknown>;

    private cacheLock: Promise<ScopedTokenState>;

    public ensureFresh = async (): Promise<ScopedTokenState> => {
        let resolveLock: (value: ScopedTokenState) => void;
        let currentLock: Promise<ScopedTokenState>;

        if (!this.cacheLock) {
            currentLock = new Promise(resolve => {
                resolveLock = resolve;
            });
            this.cacheLock = currentLock;
        } else {
            return this.cacheLock;
        }

        await this.initialSync;

        const cleanUp = (): void => {
            if (currentLock) {
                resolveLock(this);
                setTimeout(() => {
                    if (this.cacheLock === currentLock) {
                        this.cacheLock = null;
                    }
                }, this.lockTimeout);
            }
        };

        if (!this.accessToken) {
            this.accessToken = this.refreshAccessToken();
        }

        const token = await this.accessToken;

        if (!token) {
            cleanUp();
            return this;
        }
        this.expiresAt ||= this.getExpiresAt(token);
        const expiresAt = await this.expiresAt;
        const now = Date.now();

        const expired = expiresAt - 60_000 <= now; // try to refresh 60s before expiration.

        if (expired) {
            this.accessToken = this.refreshAccessToken();
            const newToken = await this.accessToken;
            this.expiresAt ||= this.getExpiresAt(newToken);
            this.emitState();
        }

        cleanUp();

        return this;
    };

    private async emitState(): Promise<void> {
        if (this.accessToken && this.expiresAt) {
            this.tokenBc.postMessage({ pending: true });
            const accessToken = await this.accessToken;
            const expiresAt = await this.expiresAt;
            this.tokenBc.postMessage({ accessToken, expiresAt });
        }
    }

    private syncState = (): Promise<ScopedTokenState> => {
        return new Promise(resolve => {
            // Response from BroadcastChannel should be nearly instant
            const autoResolve = setTimeout(() => resolve(this), 10);
            const syncHandler = ({
                data,
            }: {
                data: ScopedTokenState & { pending: boolean; sync: boolean };
            }): void => {
                if (data?.sync) {
                    return;
                }
                if (data?.pending) {
                    clearTimeout(autoResolve);
                    return;
                }
                this.handleFresh(data);
                this.tokenBc.removeEventListener('message', syncHandler);
                resolve(this);
            };
            this.tokenBc.addEventListener('message', syncHandler);
            this.tokenBc.postMessage({ sync: true });
            // Resolve after 10ms to prevent blocking if previous state isn't available on BroadcastChannel
        });
    };

    private handleFresh = (data: ScopedTokenState): void => {
        if (data?.accessToken) {
            this.accessToken = Promise.resolve(data.accessToken);
        }

        if (data?.expiresAt) {
            this.expiresAt = Promise.resolve(data.expiresAt);
        }
    };

    private getExpiresAt = async (token: string): Promise<number> => {
        const res = await fetch(`/cdb/oauth2/token/${token}`, {
            headers: { authorization: `Bearer ${token}` },
        })
            .then(res => res.json())
            .catch(() => ({}));

        this.expiresAt = Promise.resolve(res.expires_at ? parseInt(res.expires_at) : 0);

        return this.expiresAt;
    };

    private refreshAccessToken = async (): Promise<string> => {
        const csrf = getCsrf();
        if (!csrf) {
            return '';
        }

        const res = await fetch(this.refreshTokenEndpoint, {
            method: 'POST',
            headers: {
                // authorization: `Bearer ${await this.accessToken}`,
                RequestInterceptorRequest: 'true',
                'x-csrftoken': csrf,
            },
            credentials: 'include',
        })
            .then(res => res.json())
            .catch();

        if (!res) {
            return this.accessToken || '';
        }

        if (res.expires_at) {
            this.expiresAt = Promise.resolve(parseInt(res.expires_at));
        }

        const cookieLoginUrl = this.getCookieLoginUrl(res.access_token);

        if (cookieLoginUrl) {
            await fetch(cookieLoginUrl, {
                headers: {
                    RequestInterceptorRequest: 'true',
                    'x-csrftoken': csrf,
                },
            });
        }

        this.accessToken = Promise.resolve(res.access_token);

        this.emitState();

        return this.accessToken;
    };

    static INSTANCES: Record<string, ScopedTokenState> = {};

    static getInstance(
        refreshTokenEndpoint: string,
        cookieLoginUrl: string = '',
        lockTimeout = 2500,
    ): ScopedTokenState {
        if (!ScopedTokenState.INSTANCES[refreshTokenEndpoint]) {
            ScopedTokenState.INSTANCES[refreshTokenEndpoint] = new ScopedTokenState(
                refreshTokenEndpoint,
                (accessToken: string) => cookieLoginUrl.replace('{accessToken}', accessToken),
                lockTimeout,
            );
        }

        return ScopedTokenState.INSTANCES[refreshTokenEndpoint];
    }

    constructor(
        public refreshTokenEndpoint: string,
        public getCookieLoginUrl: (accessToken: string) => string,
        private lockTimeout: number,
    ) {
        this.tokenBc = new BroadcastChannel(refreshTokenEndpoint);
        this.tokenBc.onmessage = async ({ data }) => {
            if (data?.sync) {
                this.emitState();
                return;
            }
            this.handleFresh(data);
        };
        this.initialSync = this.syncState();
    }
}
