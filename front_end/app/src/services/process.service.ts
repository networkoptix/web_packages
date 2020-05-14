import { Injectable }                          from '@angular/core';
import { NxLanguageProviderService }           from './nx-language-provider';
import { NxToastService }                      from '../dialogs/toast.service';
import { NxCloudApiService }                   from './nx-cloud-api';
import { NxConfigService, IConfig }            from './nx-config';
import { NxSessionService }                    from './session.service';
import { LanguageI18NStaticTypes } from '../../language_i18n_static_types';

interface IErrorCodes {
    [key: string]: string | Function
}

interface ProcessSettings {
    errorCodes: IErrorCodes;
    errorMessage?: string;
    errorPrefix: string;
    holdAlerts: boolean;
    ignoreUnauthorized: boolean;
    logoutForbidden: boolean;
    successMessage: string;
    ignoreError?: boolean;
}

export class Process {
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;

    private deferredPromise: {
        promise: Promise<unknown>;
        reject: (...args: any) => void;
        resolve: (...args: any) => void;
    };

    private settings: ProcessSettings = {
        errorCodes         : {},
        errorMessage       : '',
        errorPrefix        : '',
        holdAlerts         : false,
        ignoreUnauthorized : false,
        logoutForbidden    : false,
        successMessage     : '',
        ignoreError        : false
    };

    public success: boolean;
    public error: boolean;
    public processing: boolean;
    public finished: boolean;
    public errorData;

    /* process handlers */
    private successHandler: (...args: any) => void;
    private errorHandler: (...args: any) => void;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private sessionService: NxSessionService,
        private cloudApiService: NxCloudApiService,
        private toastService: NxToastService,
        private caller: (...args: any) => void,
        settings: Partial<ProcessSettings>
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
        this.settings.errorPrefix = settings?.errorPrefix ? `${settings.errorPrefix}: ` : '';
        this.settings = { ...this.settings, ...settings };
    }

    run() {

        this.processing = true;
        this.error = false;
        this.success = false;
        this.finished = false;
        this.deferredPromise = this.createDeferredPromise();
        this.deferredPromise.promise.then(this.successHandler, this.errorHandler);

        /* There is a weird issue when executing a process that is passed into a modal.
         * After the first execution then caller function becomes undefined when the run
         * returns this.caller(). Wrapping it in a promise fixes the issue.
         */
        const wrapper = new Promise((resolve) => {
            return resolve(this.caller());
        });
        return wrapper.then((data) => {
            const error = this.cloudApiService.checkResponseHasError(data);
            if (error) {
                this.handleError(error);
            } else {
                this.success = true;
                if (this.settings.successMessage && data !== false) {
                    const options = {
                        classname : this.CONFIG.toast.success,
                        autohide  : !this.settings.holdAlerts,
                        delay     : this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.settings.successMessage, options);
                }
                this.deferredPromise.resolve(data);
            }
        }, (error) => {
            if (error && error.error) {
                error = error.error;
            }
            this.handleError(error);
        }).finally(() => {
            this.processing = false;
            this.finished = true;
        });
    }

    then(successHandler: (...args: any) => void, errorHandler: (...args: any) => void = () => {}) {
        this.successHandler = successHandler;
        this.errorHandler = errorHandler;
        return this;
    }

    // TODO: possible deprecation
    private createDeferredPromise() {
        return (() => {
            let res;
            let rej;

            const p = new Promise((resolve, reject) => {
                res = resolve;
                rej = reject;
            });

            return {
                promise : p,
                reject  : rej,
                resolve : res
            };
        })();
    }

    private formatError(error: any, errorCodes: any): string | false {
        const errorCode = (error && error.data && error.data.resultCode) ||
            (error && error.resultCode) ||
            (error.type === 'error' &&
            'networkConnection') ||
            error;
        if (!errorCode) {
            return this.LANG.errorCodes.unknownError;
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
        return this.LANG.errorCodes[errorCode] || this.LANG.errorCodes.unknownError;
    }

    private handleError(data) {
        this.error = true;
        this.errorData = data;
        if (!this.settings.ignoreUnauthorized && data &&
            (data.detail ||
                // detail appears only when django rest framework declines request with
                // {"detail":"Authentication credentials were not provided."}
                // we need to handle this like user was not authorised
                (data.resultCode === 'notAuthorized') ||
                (data.resultCode === 'forbidden' && this.settings.logoutForbidden))) {
            this.sessionService.invalidateSession();
            this.deferredPromise.reject(data);
            return;
        }
        const formatted = this.formatError(data, this.settings.errorCodes);
        if (formatted !== false && !this.settings.ignoreError) {
            this.settings.errorMessage = formatted;
            const message              = `${this.settings.errorPrefix} ${this.settings.errorMessage}`;
            const options              = {
                autohide  : !this.settings.holdAlerts,
                classname : this.CONFIG.toast.danger,
                delay     : this.CONFIG.alertTimeout
            };
            this.toastService.show(message, options);
        }
        this.deferredPromise.reject(data);
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
        private cloudApiService: NxCloudApiService,
        private toastService: NxToastService
    ) { }

    createProcess(caller: (...args: any) => void, settings?: Partial<ProcessSettings>) {
        return new Process(this.configService, this.languageService, this.sessionService, this.cloudApiService, this.toastService, caller, settings);
    }
}
