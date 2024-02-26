import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddPartnerUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { credentialsValidation } from '@static-variables';

@Component({
    selector: 'nx-modal-add-partner-user-content',
    templateUrl: 'add-partner-user.component.html',
    styleUrls: ['add-partner-user.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxEmailComponent,
        NxGenericDropdownModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class AddPartnerUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    public email: string;

    roles: DropdownItem<string>[] = [];
    selectedRole: DropdownItem<string>;
    roleDescriptionMap = this.LANG.channelPartners.usersTable.roleDescriptions;
    hasValidEmail$$ = signal(true);

    createUserProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) partnerId: DT['data'],
        cpService: NxChannelPartnersService,
        processService: NxProcessService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        // There's probably a smarter place to put this so we only have
        // to fetch once, but putting here for now
        this.selectedRole = { name: 'Select', value: '' };
        cpService.getChannelPartnerRoles().subscribe(roles => {
            this.roles = roles.map<DropdownItem<string>>(role => ({
                name: role.name,
                value: role.id,
            }));
        });

        this.createUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.createChannelPartnerUser(partnerId, {
                        email: this.email,
                        roleId: this.selectedRole.value,
                    }),
                );
            },
            {},
            res => this.close(res),
            err => {
                this.unlock();
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, ToastType.Danger);
            },
        );
    }

    validateEmail(email: string): void {
        const EMAIL_REGEXP = new RegExp(credentialsValidation.emailRegex);
        this.hasValidEmail$$.set(EMAIL_REGEXP.test(email));
    }
}
