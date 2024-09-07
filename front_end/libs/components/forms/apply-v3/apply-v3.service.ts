import { Injectable, computed, signal } from '@angular/core';
import type { Observable } from 'rxjs';

import { writeOnlySignal } from '@utils/nx';

import type { NxFormObserverDirective } from '../form-observer.directive';

/** Service for providing page state to guard */
@Injectable()
export class NxApplyV3Service {
    private _formObservers = signal<NxFormObserverDirective[]>([]);
    formObservers = writeOnlySignal(this._formObservers);
    unsavedFormCount = computed<number>(
        () => this._formObservers().filter(b => b.formChanged()).length,
    );

    private _processingActions = signal<Observable<unknown>[]>([]);
    processingActions = writeOnlySignal(this._processingActions);
    processingActionCount = computed<number>(() => this._processingActions().length);
}
