import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';
import { NEVER } from 'rxjs';
import { MockInstance } from 'vitest';

import { NxSessionService } from './session.service';
import { LOGIN_STATE } from './session.service.types';
import { NxSwCacheService } from './sw-cache.service';
import { NxSystemService } from './system.service/system.service';

vi.mock('./system.service/system.service', () => ({
    NxSystemService: {},
}));

class MockLocalStorage extends Map {
    retrieve(key: string): unknown {
        return super.get(key);
    }
    store(key: string, value: unknown): void {
        super.set(key, value);
    }
    observe(key: string): unknown {
        return NEVER;
    }
}

const setupSessionService = async (): Promise<{
    sessionService: NxSessionService;
    clearByName: MockInstance<
        Parameters<NxSwCacheService['clearByName']>,
        ReturnType<NxSwCacheService['clearByName']>
    >;
}> => {
    TestBed.configureTestingModule({
        providers: [
            { provide: LocalStorageService, useClass: MockLocalStorage },
            MockProvider(NxSystemService, {}),
            MockProvider(NxSwCacheService),
        ],
    });
    const sessionService = TestBed.inject(NxSessionService);
    const clearByName = vi
        .spyOn(sessionService.nxCache, 'clearByName')
        .mockImplementation(() => Promise.resolve([]));
    return {
        sessionService,
        clearByName,
    };
};

describe('Session service', () => {
    it('should create the service', async () => {
        const { sessionService: session } = await setupSessionService();
        expect(session).toBeTruthy();
    });

    it('should have setter and getter (loginState)', async () => {
        const { sessionService: session } = await setupSessionService();
        session.loginState = LOGIN_STATE.AUTHORIZED;
        expect(session.loginState).toBe(LOGIN_STATE.AUTHORIZED);
    });

    it('should invalidate session', async () => {
        const { sessionService: session, clearByName } = await setupSessionService();
        session['session'].store('loginState', 'roadrunner@acme.com');
        session['session'].store('loginRegister', true);

        session.invalidateSession();

        expect(session['session'].retrieve('loginState')).toBe(LOGIN_STATE.UNAUTHORIZED);
        expect(session['session'].retrieve('loginRegister')).toBeFalsy();
        session.cloudUserCaches.forEach(cacheName => {
            expect(clearByName).toBeCalledWith(cacheName);
        });
        expect(clearByName).toBeCalledTimes(session.cloudUserCaches.length);
    });
});
