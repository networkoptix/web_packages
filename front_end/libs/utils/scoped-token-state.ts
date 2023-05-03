import { getCsrf } from './interceptor-manager';

export class ScopedTokenState {
    tokenBc: BroadcastChannel;
    accessToken?: Promise<string>;
    expiresAt?: Promise<number>;

    initialSync = false;

    private cacheLock: Promise<ScopedTokenState>;

    public async ensureFresh(minimumSession?: number): Promise<ScopedTokenState> {
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

        if (!this.initialSync) {
            await this.syncState();
        }

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

        if (!this.accessToken || !minimumSession) {
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

        const expiresSoon = expiresAt < now + minimumSession * 1000;

        if (expiresSoon) {
            this.accessToken = this.refreshAccessToken();
            this.expiresAt = this.getExpiresAt(token);
            this.emitState();
        }

        cleanUp();

        return this;
    }

    private async emitState(): Promise<void> {
        if (this.accessToken && this.expiresAt) {
            this.tokenBc.postMessage({ pending: true });
            const accessToken = await this.accessToken;
            const expiresAt = await this.expiresAt;
            this.tokenBc.postMessage({ accessToken, expiresAt });
        }
    }

    private syncState(): Promise<ScopedTokenState> {
        return new Promise(resolve => {
            const autoResolve = setTimeout(() => resolve(this), 1000);
            const syncHandler = ({
                data,
            }: {
                data: ScopedTokenState & { pending: boolean; sync: boolean };
            }): void => {
                if (data.sync) {
                    return;
                }
                if (data.pending) {
                    clearTimeout(autoResolve);
                    return;
                }
                this.handleFresh(data);
                this.tokenBc.removeEventListener('message', syncHandler);
                this.initialSync = true;
                resolve(this);
            };
            this.tokenBc.addEventListener('message', syncHandler);
            this.tokenBc.postMessage({ sync: true });
            // Resolve after 10ms to prevent blocking if previous state isn't available on BroadcastChannel
        });
    }

    private handleFresh(data: ScopedTokenState): void {
        if (data.accessToken) {
            this.accessToken = Promise.resolve(data.accessToken);
        }

        if (data.expiresAt) {
            this.expiresAt = Promise.resolve(data.expiresAt);
        }
    }

    private async getExpiresAt(token: string): Promise<number> {
        const res = await fetch(`/cdb/oauth2/token/${token}`, {
            headers: { authorization: `Bearer ${token}` },
        })
            .then(res => res.json())
            .catch(() => ({}));

        this.expiresAt = Promise.resolve(res.expires_at ? parseInt(res.expires_at) : 0);

        return this.expiresAt;
    }

    private async refreshAccessToken(): Promise<string> {
        // eslint-disable-next-line nx/ban-global-variables
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
        }).then(res => res.json());

        if (res.expires_at) {
            this.expiresAt = Promise.resolve(parseInt(res.expires_at));
        }

        this.accessToken = Promise.resolve(res.access_token);

        this.emitState();

        return this.accessToken;
    }

    static INSTANCES: Record<string, ScopedTokenState> = {};

    static getInstance(refreshTokenEndpoint: string, lockTimeout = 2500): ScopedTokenState {
        if (!ScopedTokenState.INSTANCES[refreshTokenEndpoint]) {
            ScopedTokenState.INSTANCES[refreshTokenEndpoint] = new ScopedTokenState(
                refreshTokenEndpoint,
                lockTimeout,
            );
        }

        return ScopedTokenState.INSTANCES[refreshTokenEndpoint];
    }

    constructor(public refreshTokenEndpoint: string, private lockTimeout: number) {
        this.tokenBc = new BroadcastChannel(refreshTokenEndpoint);
        this.tokenBc.onmessage = async ({ data }) => {
            if (data.sync) {
                this.emitState();
                return;
            }
            this.handleFresh(data);
        };
    }
}
