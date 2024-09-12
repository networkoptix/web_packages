import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
    NxErrorMatches,
    errorMatcherFactory,
} from '@components/forms/form-field/error-state-matcher';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { AddPartnerUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import LANG from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { accountSelectors } from '@store/account';

interface UserInChildOrgError extends HttpErrorResponse {
    status: 400;
    error: { email: [string] };
}
/* User {user} has a role in the channel partner child organization and cannot be added to channel partner {partner}. */

@Component({
    selector: 'nx-modal-add-partner-user-content',
    templateUrl: 'add-partner-user.component.html',
    styleUrls: ['add-partner-user.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        NxFormFieldModule,
        NxInputComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class AddPartnerUserModalContent extends ModalBase<DT['return']> {
    LANG = LANG;
    private accountEmail = inject(Store).selectSignal(accountSelectors.selectCurrentUserName);
    private partnerUsers = new Set<string>(this.data.users.map(user => user.email));
    private backendRejected = new Set<string>();

    private emailControl = new FormControl('', {
        nonNullable: true,
        validators: [
            ...NxValidators.email(),
            NxValidators.forbidden(this.accountEmail, 'selfAdd'),
            NxValidators.forbidden(this.partnerUsers, 'existingUser'),
            NxValidators.forbidden(this.backendRejected, 'backendReject'),
        ],
    });
    emailErrorMatcher = errorMatcherFactory(NxErrorMatches.email(), {
        onChange: ['selfAdd', 'existingUser', 'backendReject'],
    });

    partnerRoles$$ = computed(() => {
        const roles = this.cpService.channelPartnerRoles$$();
        return roles.map(role => ({
            ...role,
            name: this.LANG.channelPartners.usersTable.accessInfo[role.id].name,
        }));
    });
    partnerRolesMessages = computed<{ key: string; text: string }[]>(() =>
        this.cpService.channelPartnerRoles$$().map(role => ({
            key: role.id,
            text: LANG.channelPartners.usersTable.accessInfo[role.id].description,
        })),
    );
    permissionGroupControl = new FormControl<string | null>(null, {
        validators: [Validators.required],
    });

    formGroup = new FormGroup({
        email: this.emailControl,
        permissionGroup: this.permissionGroupControl,
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private data: DT['data'],
        private cpService: NxChannelPartnersService,
    ) {
        super(dialogRef);
    }

    addUserAction = createAsyncAction({
        action: () =>
            firstValueFrom(
                this.cpService.createChannelPartnerUser(this.data.partnerId, {
                    email: this.emailControl.value,
                    roleId: this.permissionGroupControl.value!,
                }),
            ),
        success: res => this.close(res),
        error: (_: UserInChildOrgError) => {
            this.backendRejected.add(this.emailControl.value);
            this.emailControl.updateValueAndValidity();
        },
    });
}
