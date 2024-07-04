import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxControlMessageComponent } from '@components/forms/control-messages/control-message/control-message.component';
import { NxControlMessagesComponent } from '@components/forms/control-messages/control-messages.component';
import {
    errorMatcherFactory,
    NxErrorMatches,
} from '@components/forms/form-field/error-state-matcher';
import { NxFormFieldComponent } from '@components/forms/form-field/form-field.component';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxLabelComponent } from '@components/forms/label/label.component';
import { NxValidators } from '@components/forms/validators';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { AddChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-modal-add-partner-content',
    templateUrl: 'add-partner.component.html',
    styleUrls: ['add-partner.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxControlMessagesComponent,
        NxFormFieldComponent,
        NxInputComponent,
        NxLabelComponent,
        ReactiveFormsModule,
        PipesModule,
        NxAsyncActionButtonComponent,
        NxControlMessageComponent,
    ],
})
export class AddPartnerModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    nameErrorMatcher = errorMatcherFactory(NxErrorMatches.text(true));
    emailErrorMatcher = errorMatcherFactory(NxErrorMatches.email(true));

    nameControl = new FormControl('', { nonNullable: true });
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
        private toastService: NxToastService,
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
        error: (err: HttpErrorResponse) => {
            console.error(err);
            // @ts-expect-error "detail" property does not exist on HttpErrorResponse
            const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
            this.toastService.notify(msg, ToastType.Danger);
        },
    });
}
