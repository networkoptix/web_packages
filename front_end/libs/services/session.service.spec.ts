import { NxSessionService } from './session.service';
import { setupTestBed } from './src/setup';

const setupSessionService = async (): Promise<{
    sessionService: NxSessionService;
    clearByName: jest.SpyInstance<Promise<boolean[][]>, [cache: string]>;
}> => {
    const { inject } = await setupTestBed();
    const sessionService = inject(NxSessionService);
    const clearByName = jest
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

    it('should have setter and getter (language)', async () => {
        const { sessionService: session } = await setupSessionService();
        session.language = 'en_US';
        expect(session.language).toBe('en_US');

        session.language$.subscribe(value => {
            expect(value).toBe('en_US');
        });
    });

    it('should have setter and getter (loginState)', async () => {
        const { sessionService: session } = await setupSessionService();
        session.loginState = 'roadrunner@acme.com';
        expect(session.loginState).toBe('roadrunner@acme.com');

        session.loginStateSubject.subscribe(value => {
            expect(value).toBe('roadrunner@acme.com');
        });
    });

    it('should invalidate session', async () => {
        const { sessionService: session, clearByName } = await setupSessionService();
        session['session'].store('loginState', 'roadrunner@acme.com');
        session['session'].store('loginRegister', true);

        session.invalidateSession();

        expect(session['session'].retrieve('loginState')).toBeNull();
        expect(session['session'].retrieve('loginRegister')).toBeFalsy();
        session.cloudUserCaches.forEach(cacheName => {
            expect(clearByName).toBeCalledWith(cacheName);
        });
        expect(clearByName).toBeCalledTimes(session.cloudUserCaches.length);
        expect(session.loginStateSubject.value).toBeNull();
    });
});
