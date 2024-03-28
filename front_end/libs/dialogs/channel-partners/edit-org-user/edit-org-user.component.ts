import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { EditOrgUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-edit-org-user',
    templateUrl: 'edit-org-user.component.html',
    styleUrls: ['edit-org-user.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxGenericDropdownModule,
        NxMultiSelectDropdown,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxEditOrgUserModalContent extends ModalBase<DT['return']> implements OnInit {
    roles: DropdownItem<string>[] = [];
    role: DropdownItem<string>;
    title: string;
    editOrgUserProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA)
        {
            orgId,
            user: {
                email,
                roles: [role],
                title,
            },
        }: DT['data'],
        processService: NxProcessService,
        cpService: NxChannelPartnersService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        this.roles = cpService.organizationRoles$$().map<DropdownItem<string>>(r => ({
            name: r.name,
            value: r.id,
        }));
        this.role = this.roles.find(r => r.name === role);

        this.title = title;
        this.editOrgUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.updateOrganizationUser(orgId, {
                        email,
                        roleId: this.role.value,
                        title: this.title,
                    }),
                );
            },
            {},
            this.close,
            err => {
                this.unlock();
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, ToastType.Danger);
            },
        );
    }

    ngOnInit(): void {}
}
