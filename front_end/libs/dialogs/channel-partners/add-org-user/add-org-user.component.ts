import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
// import { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
// import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddOrgUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-add-org-user',
    templateUrl: 'add-org-user.component.html',
    styleUrls: ['add-org-user.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxEmailComponent,
        NxGenericDropdownModule,
        // MultiSelectModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxAddOrgUserModalContent extends ModalBase<DT['return']> implements OnInit {
    email: string;
    // groups: DropdownItem<string>[] = [
    //     { name: 'Bank of America', value: 'boa' },
    //     { name: 'Chase Bank', value: 'jpm' },
    //     { name: 'Silicon Valley Bank', value: 'svb' },
    // ];
    // selectedGroup: DropdownItem<string>;
    // permissions: MultiSelectItem[];
    // selectedPermissions: string[] = [];

    roles: DropdownItem<number>[] = [];
    selectedRole: DropdownItem<number>;

    addUserProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) orgId: DT['data'],
        cpService: NxChannelPartnersService,
        processService: NxProcessService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        cpService.getOrganizationRoles().subscribe(roles => {
            this.roles = roles.map<DropdownItem<number>>(role => ({
                name: role.name,
                value: role.id,
            }));
            this.selectedRole = this.roles[0];
        });

        this.addUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.createOrganizationUser(orgId, {
                        email: this.email,
                        role: this.selectedRole.name,
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

    ngOnInit(): void {}
}
