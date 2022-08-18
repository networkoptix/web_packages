import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
// import { Store } from '@ngrx/store';
// import { Observable } from 'rxjs';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSystemGroupsService } from '@pages/systems/groups/services/system-groups.service';
// import { selectGroupState } from '@pages/systems/groups.bak/store/groups/groups.selectors';
// import { GroupsState } from '@pages/systems/groups.bak/store/groups/groups.state';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: []
})
export class CreateSystemGroupModalContent implements OnInit {
    @ViewChild('createSystemGroupForm') form: NgForm;

    // _groups$: Observable<GroupsState> = this.store.select(selectGroupState);

    newGroupName: string;
    groupNames: string[];
    // parentOptions: GroupNameOption[];
    selectedParent: GroupNameOption;

    createSystemGroupProcess: Process;

    constructor(
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        // private store: Store,
        @Inject(DIALOG_DATA) _dialogData: Record<string, never>,
        private groupsService: NxSystemGroupsService,
    ) {
        // this._groups$.subscribe(groups => {
        //     const { groupNames } = groups;
        //     this.parentOptions = [
        //         { name: 'None (root)', value: null },
        //         ...Object.entries(groupNames).map(([id, name]) => ({
        //             name,
        //             value: id
        //         })),
        //     ];
        //     // Currently selected parent was removed in update
        //     const selectedRemoved = this.selectedParent &&
        //         !(this.selectedParent.value in groupNames);
        //     if (!this.selectedParent || selectedRemoved) {
        //         this.selectedParent = { name: 'None (root)', value: null };
        //     }
        // });
    }

    ngOnInit(): void {
        this.createSystemGroupProcess = this.processService.createProcess(
            () => {
                this.groupsService.createGroup(this.newGroupName);
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
