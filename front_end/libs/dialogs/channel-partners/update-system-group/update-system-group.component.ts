import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { PatchGroup } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import type { UpdateSystemGroup as DT } from '../../dialogs.types';

@Component({
    selector: 'nx-modal-update-system-group-content',
    templateUrl: 'update-system-group.component.html',
    styleUrl: 'update-system-group.component.scss',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        NxFormFieldModule,
        NxInputComponent,
        NxAsyncActionButtonComponent,
        TranslateModule,
    ],
})
export class UpdateSystemGroupModalContent extends ModalBase<DT['return']> {
    private folderNameControl = new FormControl('', {
        validators: NxValidators.text(),
        nonNullable: true,
    });

    formGroup = new FormGroup({
        renameFolder: this.folderNameControl,
    });

    constructor(
        private cpService: NxChannelPartnersService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private groupId: DT['data'],
    ) {
        super(dialogRef);
    }

    updateSystemGroupProcess = createAsyncAction({
        action: () => {
            const data: PatchGroup = {
                name: this.folderNameControl.value,
            };
            return firstValueFrom(this.cpService.patchGroup(this.groupId, data));
        },
        success: res => {
            this.close(res);
        },
    });
}
