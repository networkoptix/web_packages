import { Injectable }                          from '@angular/core';
import { NxLanguageProviderService }           from './nx-language-provider';
import { NxToastService }                      from '../dialogs/toast.service';
import { NxCloudApiService }                   from './nx-cloud-api';
import { NxConfigService, IConfig }            from './nx-config';
import { NxSessionService }                    from './session.service';
import { LanguageI18NStaticTypes, ErrorCodes } from '../../language_i18n_static_types';

interface ProcessSettings {
    errorCodes: Partial<ErrorCodes> | string;
    errorMessage?: string;
    errorPrefix: string;
    holdAlerts: boolean;
    ignoreUnauthorized: boolean;
    logoutForbidden: boolean;
    successMessage: string;
    ignoreError?: boolean;
}

export class Process {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    cloudApiService: NxCloudApiService;
    sessionService: NxSessionService;
    toastService: NxToastService;

    caller: () => void;
    settings: ProcessSettings;
    deferredPromise: {
        promise: Promise<unknown>;
        reject: any;
        resolve: any;
    };

    /* process info */
    success: boolean;
    error: boolean;
    processing: boolean;
    finished: boolean;
    errorData: any;

    /* process handlers */
    successHandler: (any) => any;
    errorHandler: (any) => any;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        sessionService: NxSessionService,
        cloudApiService: NxCloudApiService,
        toastService: NxToastService,
        caller,
        settings
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.cloudApiService = cloudApiService;
        this.sessionService = sessionService;
        this.toastService = toastService;
        this.init(caller, settings);
        return this;
    }

    init(caller, settings) {
        /*
         settings: {
         errorCodes,

         holdAlerts
         successMessage,
         errorPrefix,
         }
         settings.successMessage
         */
        if (settings) {
            settings.errorPrefix = settings.errorPrefix ? `${settings.errorPrefix}: ` : '';
            this.settings = { ...this.settings, ...settings };
        } else {
            this.settings = {
                errorCodes         : {},
                errorMessage       : '',
                errorPrefix        : '',
                holdAlerts         : false,
                ignoreUnauthorized : false,
                logoutForbidden    : false,
                successMessage     : '',
                ignoreError        : false
            };
        }
        this.caller = caller;
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
            if (this.processing) {
                const error = this.cloudApiService.checkResponseHasError(data);
                if (error) {
                    this.handleError(error);
                } else {
                    this.success = true;
                    if (this.settings.successMessage && data !== false) {
                        // nxDialogsService.notify(successMessage, this.CONFIG.toast.success, holdAlerts);
                        // Circular dependencies ... keep ngToast for no -- TT
                        const options = {
                            classname : this.CONFIG.toast.success,
                            autohide  : !this.settings.holdAlerts,
                            delay     : this.CONFIG.alertTimeout
                        };
                        this.toastService.show(this.settings.successMessage, options);
                    }
                    this.deferredPromise.resolve(data);
                }
            } else {
                this.deferredPromise.resolve('canceled');
            }
        }, (error) => {
            if (this.processing) {
                if (error && error.error) {
                    error = error.error;
                }
                this.handleError(error);
            } else {
                this.deferredPromise.reject('canceled');
            }
        }).finally(() => {
            this.processing = false;
            this.finished = true;
        });
    }

    then(successHandler: (any) => any, errorHandler?: (any) => any) {
        this.successHandler = successHandler;
        this.errorHandler = errorHandler || (() => {
        });
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

    // TODO refine error types
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

    createProcess(caller, settings?) {
        return new Process(this.configService, this.languageService, this.sessionService, this.cloudApiService, this.toastService, caller, settings);
    }
}
