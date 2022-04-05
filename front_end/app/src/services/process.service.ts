import { Injectable } from '@angular/core';
import {
    Observable,
    Subject,
    defer,
    race,
    timer
} from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxToastService } from '@dialogs/toast.service';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSessionService } from './session.service';

export interface IErrorCodes {
    [key: string]: string | Function
}

export interface ProcessSettings {
    errorCodes: IErrorCodes;
    errorMessage: string;
    errorPrefix: string;
    holdAlerts: boolean;
    ignoreUnauthorized: boolean;
    logoutForbidden: boolean;
    successMessage: string;
    ignoreError?: boolean;
    name?: string;
    timeoutMs: number;
}

type Handler = (...args: any[]) => any;

const logError = (...args) => console.error(args);

export const formatError = (
    error,
    errorCodes,
    lang: LanguageI18NStaticTypes
): string | false => {
    if (error.error && typeof error.error === 'object') {
        error = error.error;
        // Unpack nested error
    }
    if (error.error !== '4' && errorCodes && error?.errorString &&
        (!errorCodes[error?.errorString] || errorCodes[error?.errorId])
    ) {
        delete error.errorString;
    }
    const errorCode =
        error?.data?.resultCode ||
        error?.resultCode ||
        error?.type === 'error' && 'networkConnection' ||
        error?.errorText ||
        error?.errorString ||
        error?.errorId ||
        error;
    if (!errorCode) {
        return lang.errorCodes.unknownError();
    }

    if (
        error.errorText === 'second_factor_required' &&
        lang.dialogs?.message?.twoFactor
    ) {
        return lang.dialogs.message.twoFactor.required();
    }

    if (errorCodes && typeof (errorCodes[errorCode]) !== 'undefined') {
        if (typeof (errorCodes[errorCode]) === 'function') {
            const result = (errorCodes[errorCode])(error) || false;
            if (result !== true) {
                return result;
            }
        } else {
            return errorCodes[errorCode];
        }
    }
    const errorText = typeof lang.errorCodes[errorCode] === 'function'
        ? lang.errorCodes[errorCode]()
        : lang.errorCodes[errorCode];
    return errorText || lang.errorCodes.unknownError();
};

export class Process {
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    public settings: ProcessSettings = {
        errorCodes: {},
        errorMessage: '',
        errorPrefix: '',
        holdAlerts: false,
        ignoreUnauthorized: false,
        logoutForbidden: false,
        successMessage: '',
        ignoreError: false,
        name: '',
        timeoutMs: 0
    };

    // These public methods are being accessed in the nx-process-button, for some reason typescript isn't showing it though.
    public success: boolean;
    public error: boolean;
    public processing: boolean;
    public finished: boolean;
    public errorData;
    public canceled = false;
    private canceled$ = new Subject();
    public caller$: Observable<any>;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private sessionService: NxSessionService,
        private toastService: NxToastService,
        caller$: Observable<any>,
        settings: Partial<ProcessSettings> = {},
        private _successHandler: Handler = () => {},
        private _errorHandler: Handler = logError,
        private _catchHandler: Handler = logError
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.settings.errorPrefix = settings?.errorPrefix || '';
        this.settings = { ...this.settings, ...settings };
        this.caller$ = caller$.pipe(takeUntil(this.canceled$));
    }

    private checkResponseHasError<_T extends any>(data: any) {
        // this is not a repetition
        if (data?.resultCode && data.resultCode !== this.CONFIG.responseOk) {
            return data;
        }
        return false;
    }

    public run = (successHandler = (...args: any) => null, errorHandler = (...args: any) => null) => {
        this.processing = true;
        this.error = false;
        this.success = false;
        this.finished = false;
        this.canceled = false;
        const chain = (first, second) => data => {
            first(data);
            second(data);
        };
        const obs = this.settings.timeoutMs ? race(
            timer(this.settings.timeoutMs)
                .pipe(map(() => {
                    throw Error(`timeout of ${this.settings.timeoutMs}ms`);
                })),
            this.caller$
        ) : this.caller$;
        obs.subscribe(
            chain(successHandler, this.onSuccess),
            chain(errorHandler, this.onError),
            this.onComplete
        );
        return this;
    };

    // Handler method wrappers

    public onSuccess = async res => {
        if (this.canceled) { return; }
        const data = await res;
        const error = this.checkResponseHasError(data);
        if (error || data?.error && data.error !== '0') {
            return this.errorHelper(error || data);
        } else {
            this.success = true;
            if (this.settings.successMessage && data !== false) {
                const options = {
                    classname: this.CONFIG.toast.success,
                    autohide: !this.settings.holdAlerts,
                    delay: this.CONFIG.alertTimeout
                };
                this.toastService.show(this.settings.successMessage, options);
            }
            return this._successHandler(data);
        }
    };

    public onError = error => {
        if (error && error.error) {
            error = error.error;
        }
        return this.errorHelper(error);
    };

    public onComplete = () => {
        this.processing = false;
        this.finished = true;
    };

    /**
     * @deprecated
     * This method is to maintain compatibilty with existing code.
     *
     * For readability successHandler and errorHandler should be assigned
     * when calling NxProcessService.createProcess.
     *
     * @param successHandler
     * @param errorHandler
     */
    public then(successHandler, errorHandler = logError) {
        this._successHandler = successHandler;
        this._errorHandler = errorHandler;
        return this;
    }

    /**
     * @deprecated
     * This method is to maintain compatibility with exisiting code.
     *
     * For readability catchHandler should be assigned when calling NxProcessService.createProcess.
     *
     * @param catchHandler
     */
    public catch(catchHandler) {
        this._catchHandler = catchHandler;
        return this;
    }

    /**
     * To make a cancelable button use <nx-cancel-button [process]="process"></nx-cancel-button>
     */
    public cancel() {
        this.processing = false;
        this.canceled = true;
        this.canceled$.next(true);
    }

    private errorHelper(data) {
        if (this.canceled) {
            return;
        }
        this.error = true;
        this.errorData = data;
        if (!this.settings.ignoreUnauthorized && data &&
            (data.detail ||
                (data.resultCode === 'notAuthorized') ||
                (data.resultCode === 'forbidden' && this.settings.logoutForbidden))
        ) {
            this.sessionService.invalidateSession();
            this.error = true;
            this.errorData = data;
            this.processing = false;
            this._errorHandler(data);
            return;
        }
        const formatted = formatError(data, this.settings.errorCodes, this.LANG);
        if (formatted !== false && !this.settings.ignoreError) {
            this.settings.errorMessage = formatted;
            const message = `${this.settings.errorPrefix
                ? this.settings.errorPrefix + ': '
                : ''}${this.settings.errorMessage}`;

            const options = {
                autohide: !this.settings.holdAlerts,
                classname: this.CONFIG.toast.danger,
                delay: this.CONFIG.alertTimeout
            };
            this.toastService.show(message, options);
        }
        this.error = true;
        this.errorData = data;
        this.processing = false;
        this._errorHandler(data);
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxProcessService {
    constructor(
        private configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private sessionService: NxSessionService,
        private toastService: NxToastService
    ) { }

    /**
     * NxProcessService.createProcess has been updated to allow passing in either a promise or an observable.
     *
     * To make a cancelable button use <nx-cancel-button [process]="process"></nx-cancel-button>
     *
     * @param caller - Can be a function that returns a promise or an observable
     * @param settings - ProcesSettings
     * @param successHandler - Success handler can be assigned here or on .then(successHandler, errorHandler) method
     * @param errorHandler - Error handler can be assigned here or on .then(successHandler, errorHandler) method.
     * @param catchHandler - Catch handler can be assigned on here or on .catch(catchHandler) method.
     */
    public createProcess(
        caller: (() => PromiseLike<any>) | Observable<any>,
        settings?: Partial<ProcessSettings>,
        successHandler: Handler = () => {},
        errorHandler: Handler = logError,
        catchHandler: Handler = logError
    ) {
        const _caller = typeof caller === 'function' ? defer(caller) : caller;
        return new Process(
            this.configService,
            this.languageService,
            this.sessionService,
            this.toastService,
            _caller,
            settings,
            successHandler,
            errorHandler,
            catchHandler
        );
    }
}
