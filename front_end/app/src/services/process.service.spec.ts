import {
    waitForAsync,
    TestBed,
    fakeAsync,
    tick
} from '@angular/core/testing';

import { NxToastService } from '@dialogs/toast.service';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxSessionService } from '@services/session.service';

describe('Process service', () => {
    let process: jasmine.SpyObj<NxProcessService>;
    let toast: jasmine.SpyObj<NxToastService>;
    let toastSpy;
    const toastOptions = { autohide: true, classname: 'danger', delay: 3000 };

    const configMock = { getConfig: () => nxConfig };

    const translateMock = {
        translations: {
            dialogs: {
                message: {
                    twoFactor: {
                        required: () => 'Required'
                    }
                }
            },
            errorCodes: {
                fail: () => 'Fail',
                unknownError: () => 'Unknown error'
            }
        }
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxToastService,
                NxToastService,
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxSessionService, useValue: {} }
            ]
        });
        process = TestBed.inject(NxProcessService) as jasmine.SpyObj<NxProcessService>;
        toast = TestBed.inject(NxToastService) as jasmine.SpyObj<NxToastService>;
        toastSpy = spyOn(toast, 'show').and.callThrough();
    }));

    it('should create the service', () => {
        expect(process).toBeTruthy();
    });

    it('should create process and run successful', () => {
        process.createProcess(() => {
            return Promise.resolve('success');
        }, {}).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toBe('fail');
        }).run();
    });

    // Testing different error formats
    it('should create process and fail w/ LANG defined error ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject('fail');
        }, {}).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toBe('fail');
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Fail', toastOptions);
    }));

    it('should create process and fail w/ settings defined error ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject('forbidden');
        }, {
            errorCodes: {
                forbidden: 'failed forbidden'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toBe('forbidden');
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('failed forbidden', toastOptions);
    }));

    it('should create process and fail w/ unknown error No.1 ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject('blah-blah');
        }, {
            errorCodes: {
                forbidden: 'failed forbidden'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toBe('blah-blah');
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith(translateMock.translations.errorCodes.unknownError(), toastOptions);
    }));

    it('should create process and fail w/ unknown error No.2 ', fakeAsync(() => {
        // unknown error pattern
        process.createProcess(() => {
            return Promise.reject({ error: { resultMessage: 'boom' } });
        }, {
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ resultMessage: 'boom' });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith(translateMock.translations.errorCodes.unknownError(), toastOptions);
    }));

    it('should create process and fail w/ error.resultCode ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject({ error: { resultCode: 'boom' } });
        }, {
            errorCodes: {
                boom: 'Boom!'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ resultCode: 'boom' });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Boom!', toastOptions);
    }));

    it('should create process and fail w/ error.errorText ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject({ error: { errorText: 'boom' } });
        }, {
            errorCodes: {
                boom: 'Boom!'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ errorText: 'boom' });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Boom!', toastOptions);
    }));

    it('should create process and fail w/ error.errorId ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject({ error: { errorId: 'boom' } });
        }, {
            errorCodes: {
                boom: 'Boom!'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ errorId: 'boom' });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Boom!', toastOptions);
    }));

    it('should create process and fail w/ error.data.resultCode ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject({ error: { data: { resultCode: 'boom' } } });
        }, {
            errorCodes: {
                boom: 'Boom!'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ data: { resultCode: 'boom' } });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Boom!', toastOptions);
    }));

    it('should create process and fail w/ error.type ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject({ error: { type: 'error' } });
        }, {
            errorCodes: {
                networkConnection: 'Network Connection Fail'
            },
            holdAlerts: false
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ type: 'error' });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Network Connection Fail', toastOptions);
    }));

    it('should create process and fail w/ 2fa error.errorText ', fakeAsync(() => {
        process.createProcess(() => {
            return Promise.reject({ error: { errorText: 'second_factor_required' } });
        }, {
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ errorText: 'second_factor_required' });
        }).run();

        tick();
        expect(toastSpy).toHaveBeenCalledOnceWith('Required', toastOptions);
    }));
});
