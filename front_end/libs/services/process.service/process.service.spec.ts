import { ToastOptions } from '@app/components/toast-container/toast.types';
import { Translatable } from '@app/pipes/nx-translate.types';
import staticLang from '@common/language/language_i18n_static.json';

import { setupTestBed } from '../src/setup';

import { NxProcessService } from './process.service';

const toastOptions = { autohide: true };

const setupProcess = async (): Promise<{
    process: NxProcessService;
    toastSpy: jest.SpyInstance<void, [content: Translatable, type?: string, options?: ToastOptions]>;
}> => {
    const { inject } = await setupTestBed();
    const process = inject(NxProcessService);
    const toastSpy = jest.spyOn(process.toastService, 'show').mockImplementation(() => {});

    return {
        toastSpy,
        process
    };
};

describe('Process service', () => {
    it('should create the service', async () => {
        const { process } = await setupProcess();

        expect(process).toBeTruthy();
    });

    it('should create process and run successful', async () => {
        const { process } = await setupProcess();
        await process.createProcess(() => {
            return Promise.resolve('success');
        }, {}).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toBe('fail');
        }).run().completePromise;
    });

    // Testing different error formats
    it('should create process and fail w/ LANG defined error ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
            return Promise.reject('fail');
        }, {}).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toBe('fail');
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith(
            staticLang.errorCodes.fail,
            'danger',
            toastOptions
        );
    });

    it('should create process and fail w/ settings defined error ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy)
            .toHaveBeenCalledWith('failed forbidden', 'danger', toastOptions);
    });

    it('should create process and fail w/ unknown error No.1 ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith(
            staticLang.errorCodes.unknownError,
            'danger',
            toastOptions,
        );
    });

    it('should create process and fail w/ unknown error No.2 ', async () => {
        const { process, toastSpy } = await setupProcess();

        // unknown error pattern
        await process.createProcess(() => {
            return Promise.reject({ error: { resultMessage: 'boom' } });
        }, {
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ resultMessage: 'boom' });
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith(
            staticLang.errorCodes.unknownError,
            'danger',
            toastOptions
        );
    });

    it('should create process and fail w/ error.resultCode ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith('Boom!', 'danger', toastOptions);
    });

    it('should create process and fail w/ error.errorText ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith('Boom!', 'danger', toastOptions);
    });

    it('should create process and fail w/ error.errorId ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith('Boom!', 'danger', toastOptions);
    });

    it('should create process and fail w/ error.data.resultCode ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith('Boom!', 'danger', toastOptions);
    });

    it('should create process and fail w/ error.type ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
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
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith(
            'Network Connection Fail',
            'danger',
            toastOptions,
        );
    });

    it('should create process and fail w/ 2fa error.errorText ', async () => {
        const { process, toastSpy } = await setupProcess();

        await process.createProcess(() => {
            return Promise.reject({ error: { errorText: 'second_factor_required' } });
        }, {
        }).then(response => {
            expect(response).toBe('success');
        }, error => {
            expect(error).toEqual({ errorText: 'second_factor_required' });
        }).run().completePromise;

        expect(toastSpy).toHaveBeenCalledWith(staticLang.dialogs.message.twoFactor.required, 'danger', toastOptions);
    });
});
