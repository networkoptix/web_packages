import { Component, inject, Input, signal } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { FormActions, NxCanNavigate } from '@services/apply.service/apply.service.type';
import type { NxUser } from '@services/system-user.types';
import { NxSystem } from '@services/system.service/system';
import { NxFormGroup } from '@utils/reactive-form-builder';

import { UserFormControls } from './user-form.types';

@Component({
    selector: 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss'],
})
export class NxSystemUsersComponent implements NxCanNavigate {
    @Input() system: NxSystem;
    @Input() user: NxUser;

    private dialogService = inject(NxDialogsService);
    userFormSignal$$ = signal<NxFormGroup<UserFormControls> | undefined>(undefined);
    onNavigate: FormActions;
    canNavigate(): Promise<boolean> {
        const canNavigate = this.userFormSignal$$();
        if (canNavigate?.dirty) {
            return this.showApplyDialog();
        }
        return Promise.resolve(true);
    }

    async showApplyDialog(): Promise<boolean> {
        const { applyFunc, discardFunc } = this.onNavigate;
        const status = await this.dialogService.apply({ applyFunc, discardFunc });
        return status !== 'canceled';
    }

    setFormActions(actions: FormActions): void {
        this.onNavigate = actions;
    }
}
