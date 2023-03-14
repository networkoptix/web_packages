import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import type { CreateSystemGroup as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxSystemGroupsService } from '@pages/systems/groups/services/system-groups.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { pickFrom } from '@utils/general';

// type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: ['create-system-group.component.scss'],
})
export class CreateSystemGroupModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    @ViewChild('createSystemGroupForm') form: NgForm;

    newGroupName: string;
    // groupNames: string[];
    // parentOptions: GroupNameOption[];
    // selectedParent: GroupNameOption;

    targetId: string | undefined;
    parentGroup: string | undefined;
    hasGroups: boolean | undefined;

    createSystemGroupProcess: Process;

    constructor(
        private processService: NxProcessService,
        protected dialogRef: DialogRef<DT['return']>,
        // private store: Store,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
        private groupsService: NxSystemGroupsService,
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['targetId', 'parentGroup', 'hasGroups'], this);
        this.createSystemGroupProcess = this.processService.createProcess(
            () => {
                this.groupsService.createGroup(this.newGroupName, this.targetId);
                return Promise.resolve();
            },
            {},
            () => this.close()
        );
    }
}
