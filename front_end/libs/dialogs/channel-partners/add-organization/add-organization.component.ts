import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxAsyncSubmitButtonModule } from '@components/forms/buttons/async-submit-button/async-submit-button.module';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { AddOrganization as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';

@Component({
    selector: 'nx-modal-add-organization-content',
    templateUrl: 'add-organization.component.html',
    styleUrls: ['add-organization.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        ReactiveFormsModule,
        NxFormFieldModule,
        NxInputComponent,
        NxAsyncSubmitButtonModule,
    ],
})
export class AddOrganizationModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    private orgNameControl = new FormControl('', {
        validators: NxValidators.text(),
        nonNullable: true,
    });

    formGroup = new FormGroup({
        orgName: this.orgNameControl,
    });

    constructor(
        private cpService: NxChannelPartnersService,
        @Inject(DIALOG_DATA) private channelPartner: DT['data'],
        dialogRef: DialogRef<DT['return']>,
    ) {
        super(dialogRef);
    }

    addOrganizationProcess = createAsyncAction({
        action: () => {
            return this.cpService.createOrganization({
                name: this.orgNameControl.value,
                channelPartner: this.channelPartner,
            });
        },
        success: res => {
            this.close(res);
        },
    });
}
