import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import type { EditOrgUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-edit-org-user',
    templateUrl: 'edit-org-user.component.html',
    styleUrls: ['edit-org-user.component.scss'],
})
export class NxEditOrgUserModalContent extends ModalBase<DT['return']> implements OnInit {
    LANG = staticLang;

    groups: DropdownItem<string>[] = [
        { name: 'Bank of America', value: 'boa' },
        { name: 'Chase Bank', value: 'jpm' },
        { name: 'Silicon Valley Bank', value: 'svb' },
    ];
    selectedGroup: DropdownItem<string>;
    permissions: MultiSelectItem[];
    selectedPermissions: string[] = [];
    editProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) dialogData: DT['data'],
        private processService: NxProcessService,
        configService: NxConfigService,
    ) {
        super(dialogRef);
        this.selectedGroup = this.groups[0];
        this.permissions = configService.config.accessRoles.predefinedRoles
            .filter(r => !r.isOwner)
            .map(r => ({
                id: r.name,
                label: r.name,
            }));
    }

    ngOnInit(): void {
        this.editProcess = this.processService.createProcess(
            () => {
                return Promise.resolve();
            },
            {},
            () => {
                // success
            },
            () => {
                // fail
            }
        );
    }

    updatePermissions(selected: string[]): void {
        this.selectedPermissions = [...selected];
    }
}
