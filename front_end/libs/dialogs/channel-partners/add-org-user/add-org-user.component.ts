import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
// import { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddOrgUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-add-org-user',
    templateUrl: 'add-org-user.component.html',
    styleUrls: ['add-org-user.component.scss'],
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

    roles: DropdownItem<Id>[] = [];
    selectedRole: DropdownItem<Id>;

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
            this.roles = roles.map<DropdownItem<Id>>(role => ({
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
