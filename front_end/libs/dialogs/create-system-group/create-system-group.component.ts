import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSystemGroupsService } from '@pages/systems/groups/services/system-groups.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

// type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: []
})
export class CreateSystemGroupModalContent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    @ViewChild('createSystemGroupForm') form: NgForm;

    newGroupName: string;
    // groupNames: string[];
    // parentOptions: GroupNameOption[];
    // selectedParent: GroupNameOption;

    target_id: string | undefined;

    createSystemGroupProcess: Process;

    constructor(
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        // private store: Store,
        @Inject(DIALOG_DATA) dialogData: {
            target_id?: string;
        },
        private groupsService: NxSystemGroupsService,
    ) {
        this.LANG = language.translations;
        this.target_id = dialogData.target_id;
    }

    ngOnInit(): void {
        this.createSystemGroupProcess = this.processService.createProcess(
            () => {
                this.groupsService.createGroup(this.newGroupName, this.target_id);
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
