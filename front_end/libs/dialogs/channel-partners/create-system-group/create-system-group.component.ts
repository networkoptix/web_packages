import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { CreateSystemGroup as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: ['create-system-group.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,

        NxFormFieldModule,
        NxInputComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class CreateSystemGroupModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    private folderNameControl = new FormControl('', {
        validators: NxValidators.text(),
        nonNullable: true,
    });

    formGroup = new FormGroup({
        folderName: this.folderNameControl,
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        private cpService: NxChannelPartnersService,
        @Inject(DIALOG_DATA) private data: DT['data'],
    ) {
        super(dialogRef);
    }

    createGroupAction = createAsyncAction({
        action: () =>
            firstValueFrom(
                this.cpService.createGroup({
                    name: this.folderNameControl.value,
                    parentId: this.data.parentGroup ?? null,
                    organizationId: this.data.orgId,
                }),
            ),
        success: res => this.close(res),
    });
}
