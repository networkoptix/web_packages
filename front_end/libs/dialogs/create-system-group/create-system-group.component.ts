import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSystemGroupsService } from '@pages/systems/groups/services/system-groups.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

// type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: ['create-system-group.component.scss'],
})
export class CreateSystemGroupModalContent implements OnInit {
    LANG = staticLang;

    @ViewChild('createSystemGroupForm') form: NgForm;

    newGroupName: string;
    // groupNames: string[];
    // parentOptions: GroupNameOption[];
    // selectedParent: GroupNameOption;

    targetId: string | undefined;
    targetName: string | undefined;
    hasGroups: boolean | undefined;

    createSystemGroupProcess: Process;

    constructor(
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        // private store: Store,
        @Inject(DIALOG_DATA) dialogData: {
            targetId?: string;
            targetName?: string;
            hasGroups?: boolean;
        },
        private groupsService: NxSystemGroupsService,
    ) {
        [this.targetId, this.targetName, this.hasGroups] = [dialogData.targetId, dialogData.targetName, dialogData.hasGroups];
    }

    ngOnInit(): void {
        this.createSystemGroupProcess = this.processService.createProcess(
            () => {
                this.groupsService.createGroup(this.newGroupName, this.targetId);
                return Promise.resolve();
            },
            {},
            () => this.dialogRef.close()
        );
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
