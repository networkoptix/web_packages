import { Injectable } from '@angular/core';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxAccountService } from './account.service';
import { NxToastService } from '../dialogs/toast.service';
import { NxCloudApiService } from './nx-cloud-api';

interface ProcessSettings {
    errorCodes: any;
    errorMessage: string;
    errorPrefix: string;
    holdAlerts: boolean;
    ignoreUnauthorized: boolean;
    logoutForbidden: boolean;
    successMessage: string;
}


class Process {
    LANG: any;
    accountService: any;
    cloudApiService: any;
    toastService: any;

    caller: any;
    settings: ProcessSettings;
    deferredPromise: any;

    /* process info */
    success: boolean;
    error: boolean;
    processing: boolean;
    finished: boolean;
    errorData: any;

    /* process handlers */
    successHandler: any;
    errorHandler: any;
    processHandler: any;


    constructor(LANG, accountService, cloudApiService, toastService, caller, settings) {
        this.LANG = LANG;
        this.accountService = accountService;
        this.cloudApiService = cloudApiService;
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
            if (settings.errorPrefix) {
                settings.errorPrefix = `(${settings.errorPrefix}: )`;
            }
            this.settings = {... this.settings, ... settings};
        }
        this.caller = caller;
    }

    run() {
        this.processing = true;
        this.error = false;
        this.success = false;
        this.finished = false;

        this.deferredPromise = this.createDeferedPromise();
        this.deferredPromise.promise.then(this.successHandler, this.errorHandler, this.processHandler);
        return this.caller().then((data) => {
            this.processing = false;
            this.finished = true;

            const error = this.cloudApiService.checkResponseHasError(data);
            if (error) {
                this.handleError(error);
            } else {
                this.success = true;
                if (this.settings.successMessage && data !== false) {
                    // nxDialogsService.notify(successMessage, 'success', holdAlerts);
                    // Circular dependencies ... keep ngToast for no -- TT
                    const options = {
                        classname: 'success',
                        autoHide: !this.settings.holdAlerts
                    };
                    this.toastService.show(this.settings.successMessage, options);
                }
                this.deferredPromise.resolve(data);
            }
        }, (error) => {
            this.handleError(error);
        }, (progress) => {
            this.deferredPromise.notify(progress);
        });
    }

    then(successHandler, errorHandler, processHandler) {
        this.successHandler = successHandler;
        this.errorHandler = errorHandler;
        this.processHandler = processHandler;
        return this;
    }

    private createDeferedPromise() {
        return (() => {
            let resolve;
            let reject;

            const p = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });

            return {
                promise: p,
                reject,
                resolve
            };
        })();
    }
    private formatError(error, errorCodes) {
        if (!error || !error.resultCode) {
            return this.LANG.errorCodes.unknownError;
        }
        if (errorCodes && typeof (errorCodes[error.resultCode]) !== 'undefined') {
            if (typeof(errorCodes[error.resultCode]) === 'function') {
                const result = (errorCodes[error.resultCode])(error) || false;
                if (result !== true) {
                    return result;
                }
            } else {
                return errorCodes[error.resultCode];
            }
        }
        return this.LANG.errorCodes[error.resultCode] || this.LANG.errorCodes.unknownError;
    }

    private handleError(data) {
        this.processing = false;
        this.finished = true;
        this.error = true;
        this.errorData = data;
        if (!this.settings.ignoreUnauthorized && data &&
            data.data &&
            (data.data.detail ||
                // detail appears only when django rest framewrok declines request with
                // {"detail":"Authentication credentials were not provided."}
                // we need to handle this like user was not authorised
                data.data.resultCode === 'notAuthorized' ||
                data.data.resultCode === 'forbidden' && this.settings.logoutForbidden)) {
            this.accountService.logout();
            this.deferredPromise.reject(data);
            return;
        }
        const formatted = this.formatError(data && data.data || data, this.settings.errorCodes);
        if (formatted !== false) {
            this.settings.errorMessage = formatted;
            // Error handler here
            // Circular dependencies ... keep ngToast for no -- TT
            // nxDialogsService.notify(errorPrefix + this.errorMessage, 'danger', holdAlerts);
            const message = `${this.settings.errorPrefix} ${this.settings.errorMessage}`;
            const options = {
                className: 'danger',
                autoHide: !this.settings.holdAlerts,
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
    LANG: any;
    constructor(private languageService: NxLanguageProviderService,
                private accountService: NxAccountService,
                private cloudApiService: NxCloudApiService,
                private toastService: NxToastService) {
        this.LANG = this.languageService.getLang();
    }

    createProcess(caller, settings?) {
        return new Process(this.LANG, this.accountService, this.cloudApiService, this.toastService, caller, settings);
    }
}
