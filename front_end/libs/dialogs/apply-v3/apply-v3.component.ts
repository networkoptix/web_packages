import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxButtonLoadingDotsComponent } from '@components/forms/buttons/button-loading-dots/button-loading-dots.component';
import type { ApplyV3 as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';

import { Steps } from './apply-v3.types';

@Component({
    selector: 'nx-apply-v3',
    templateUrl: 'apply-v3.component.html',
    styleUrls: ['apply-v3.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxButtonLoadingDotsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxApplyV3ModalContent extends ModalBase<DT['return']> {
    Steps = Steps;

    currentStep = signal<Steps>(Steps.UnsavedChanges);
    otherUnsavedChanges = false;

    constructor(dialogRef: DialogRef<DT['return']>, @Inject(DIALOG_DATA) data: DT['data']) {
        super(dialogRef, false);
        const { step } = data;
        this.currentStep.set(step);
        if (data.step === Steps.Saving) {
            const { actions$, otherUnsavedChanges } = data;
            this.otherUnsavedChanges = otherUnsavedChanges;
            actions$.subscribe(success => {
                if (success) {
                    if (!otherUnsavedChanges) {
                        this.leave();
                    } else {
                        this.currentStep.set(Steps.UnsavedChanges);
                    }
                } else {
                    this.currentStep.set(Steps.FailedToSave);
                }
            });
        }
    }

    stay(): void {
        this.close(false);
    }

    leave(): void {
        this.close(true);
    }
}
