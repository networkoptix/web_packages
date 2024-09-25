import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxAsyncSubmitButtonModule } from '@components/forms/buttons/async-submit-button/async-submit-button.module';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { AddChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';

@Component({
    selector: 'nx-modal-add-partner-content',
    templateUrl: 'add-partner.component.html',
    styleUrls: ['add-partner.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        NxFormFieldModule,
        NxInputComponent,
        NxAsyncSubmitButtonModule,
    ],
})
export class AddPartnerModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    nameControl = new FormControl('', {
        validators: NxValidators.text(),
        nonNullable: true,
    });
    emailControl = new FormControl('', {
        validators: NxValidators.email(),
        nonNullable: true,
    });
    formGroup = new FormGroup({
        email: this.emailControl,
        name: this.nameControl,
    });

    /* Assuming no way to create top level partners for now, also assuming that
    create partner buttons will be all associated with a parent partner */
    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private parentChannelPartner: DT['data'],
        private cpService: NxChannelPartnersService,
    ) {
        super(dialogRef);
    }

    addPartnerAction = createAsyncAction({
        action: () => {
            return firstValueFrom(
                this.cpService.createChannelPartner({
                    name: this.nameControl.value,
                    parentChannelPartner: this.parentChannelPartner,
                    firstAdminEmail: this.emailControl.value,
                }),
            );
        },
        success: res => {
            this.close(res);
        },
    });
}
