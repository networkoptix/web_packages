import { waitForAsync, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';

import { WINDOW } from '@services/window-provider';

import { NxSessionService } from './session.service';

describe('Session service', () => {
    let session: NxSessionService;

    let localStorageMockStore = {};
    const localStorageMock = {
        retrieve: (key: string) => localStorageMockStore[key],
        store: (key: string, value: any) => {
            localStorageMockStore[key] = value;
        },
        observe: () => ({
            subscribe: () => {}
        })
    };

    beforeEach(waitForAsync(() => {
        localStorageMockStore = {};
        TestBed.configureTestingModule({
            providers: [
                { provide: LocalStorageService, useValue: localStorageMock },
                { provide: WINDOW, useValue: {} }
            ]
        });
        session = TestBed.inject(NxSessionService);
        session['session'] = TestBed.inject(LocalStorageService);
    }));

    it('should create the service', () => {
        expect(session).toBeTruthy();
    });

    it('should return empty email if not set', () => {
        expect(session.email).toBe(undefined);
    });

    it('should have setter and getter (email)', () => {
        session.email = 'roadrunner@acme.com';
        expect(session.email).toBe('roadrunner@acme.com');
    });

    it('should have setter and getter (language)', () => {
        session.language = 'en_US';
        expect(session.language).toBe('en_US');

        session.language$.subscribe(value => {
            expect(value).toBe('en_US');
        });
    });

    it('should have setter and getter (loginState)', () => {
        session.loginState = 'roadrunner@acme.com';
        expect(session.loginState).toBe('roadrunner@acme.com');

        session.loginStateSubject.subscribe(value => {
            expect(value).toBe('roadrunner@acme.com');
        });
    });

    it('should invalidate session', () => {
        session['session'].store('loginState', 'roadrunner@acme.com');
        session['session'].store('loginRegister', true);

        session.invalidateSession();

        expect(session['session'].retrieve('loginState')).toBeNull();
        expect(session['session'].retrieve('loginRegister')).toBeFalse();

        session.loginStateSubject.subscribe(value => {
            expect(value).toBeNull();
        });
    });
});
