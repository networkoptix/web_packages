import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
// import { NxConfigService } from '@services/nx-config/nx-config.service';
// import { NxLanguageProviderService } from '@services/nx-language-provider';
import * as GroupActions from '@pages/systems/groups/store/groups/groups.actions';
import { selectGroupState } from '@pages/systems/groups/store/groups/groups.selectors';
import { GroupsState } from '@pages/systems/groups/store/groups/groups.state';
import { NxProcessService, Process } from '@services/process.service';

type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: []
})
export class CreateSystemGroupModalContent implements OnInit {
    @ViewChild('createSystemGroupForm') form: NgForm;

    _groups$: Observable<GroupsState> = this.store.select(selectGroupState);

    newGroupName: string;
    groupNames: string[];
    parentOptions: GroupNameOption[];
    selectedParent: GroupNameOption;

    createSystemGroupProcess: Process;

    constructor(
        // configService: NxConfigService,
        // language: NxLanguageProviderService,
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        private store: Store,
        @Inject(DIALOG_DATA) _dialogData: {},
    ) {
        this._groups$.subscribe(groups => {
            const { groupNames } = groups;
            this.parentOptions = [
                { name: 'None (root)', value: null },
                ...Object.entries(groupNames).map(([id, name]) => ({
                    name,
                    value: id
                }))
            ];
            // Currently selected parent was removed in update
            const selectedRemoved = this.selectedParent &&
                !(this.selectedParent.value in groupNames);
            if (!this.selectedParent || selectedRemoved) {
                this.selectedParent = { name: 'None (root)', value: null };
            }
        });
    }

    ngOnInit(): void {
        this.createSystemGroupProcess = this.processService.createProcess(
            () => {
                this.store.dispatch(
                    GroupActions.createGroup({
                        name: this.newGroupName,
                        parentId: this.selectedParent.value,
                        groupId: uuid(),
                    })
                );
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
