import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    AbstractControl,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddPartnerUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxValidators } from '@libs/validators/input-validators';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
@Component({
    selector: 'nx-modal-add-partner-user-content',
    templateUrl: 'add-partner-user.component.html',
    styleUrls: ['add-partner-user.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ReactiveFormsModule,
        NxGenericDropdownModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class AddPartnerUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;
    roles: DropdownItem<string>[] = [];
    selectedRole: DropdownItem<string>;
    roleDescriptionMap = this.LANG.channelPartners.usersTable.roleDescriptions;
    partnerAddUserRoleFocused$$ = signal(false);

    createUserProcess: Process;
    form: FormGroup;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { partnerId, users }: DT['data'],
        cpService: NxChannelPartnersService,
        processService: NxProcessService,
        toastService: NxToastService,
        private formBuilder: FormBuilder,
        private nxValidators: NxValidators,
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
        this.form = this.formBuilder.group({
            email: this.formBuilder.control({ value: '', disabled: false }, [
                this.nxValidators.requiredEmail(),
                this.nxValidators.email(),
                this.nxValidators.uniqueEmail(new Map(users.map(user => [user.email, user]))),
            ]),
        });

        this.createUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.createChannelPartnerUser(partnerId, {
                        email: this.form.get('email')?.value,
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

    get emailInput(): AbstractControl<unknown | unknown> | null {
        return this.form.get('email');
    }
}
