import { NxSessionService } from './session.service';
import { LOGIN_STATE } from './session.service.types';
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
