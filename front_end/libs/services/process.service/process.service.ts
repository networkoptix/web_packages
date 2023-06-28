import { Injectable } from '@angular/core';
import { Observable, defer } from 'rxjs';

import { NxToastService } from '@services/toast.service';

import { NxSessionService } from '../session.service';

import { ProcessSettings, Handler, logError, Process } from './process';

@Injectable({
    providedIn: 'root',
})
export class NxProcessService {
    constructor(private sessionService: NxSessionService, public toastService: NxToastService) {}

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
    ) {
        const _caller = typeof caller === 'function' ? defer(caller) : caller;
        return new Process(
            this.sessionService,
            this.toastService,
            _caller,
            settings,
            successHandler,
            errorHandler,
        );
    }
}
