import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { catchError, combineLatest, map, of, shareReplay } from 'rxjs';

import { Steps } from '@dialogs/apply-v3/apply-v3.types';
import { NxDialogsService } from '@dialogs/dialogs.service';

import type { NxApplyV3Page } from './apply-v3-page';

const actionError = Symbol('actionError');

/** Guard to stop users from leaving pages while there are unsaved changes */
export const nxApplyV3Guard = (({ applyV3Service }, _currentRoute, _currentState, _nextState) => {
    const dialogs = inject(NxDialogsService);
    if (applyV3Service.processingActionCount()) {
        const actions$ = combineLatest(
            // @ts-expect-error Service accesibility is for limiting children, not guard
            applyV3Service._processingActions().map(o =>
                o.pipe(
                    catchError(() => {
                        return of(actionError);
                    }),
                ),
            ),
        ).pipe(
            map(res => !res.includes(actionError)),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
        const otherUnsavedChanges = !!(
            applyV3Service.unsavedFormCount() - applyV3Service.processingActionCount()
        );
        return dialogs.applyV3({
            step: Steps.Saving,
            actions$,
            otherUnsavedChanges,
        });
    } else if (applyV3Service.unsavedFormCount()) {
        return dialogs.applyV3({
            step: Steps.UnsavedChanges,
        });
    } else {
        return true;
    }
}) satisfies CanDeactivateFn<NxApplyV3Page>;
