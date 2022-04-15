import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSystemGroupsService } from '@pages/systems/groups/services/system-groups.service';
import { selectGroupState } from '@pages/systems/groups/store/groups/groups.selectors';
import type { GroupsState } from '@pages/systems/groups/store/groups/groups.state';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { selectSystems } from '@src/store/systems/systems.selectors';
import { SystemsState } from '@src/store/systems/systems.state';

type SystemNameOption = DropdownItem<string>;
type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-move-system-to-group-content',
    templateUrl: 'move-system-to-group.component.html',
    styleUrls: []
})
export class MoveSystemToGroupModalContent implements OnInit {
    @ViewChild('moveSystemForm') form: NgForm;

    _groups$: Observable<GroupsState> = this.store.select(selectGroupState);
    groups: GroupsState;

    _systems$: Observable<SystemsState> = this.store.select(selectSystems);

    selectedSystem: SystemNameOption;
    systemNameOptions: SystemNameOption[];

    selectedGroup: GroupNameOption;
    targetGroupOptions: GroupNameOption[];

    moveSystemProcess: Process;

    constructor(
        private processService: NxProcessService,
        private store: Store,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) _dialogData: Record<string, never>,
        private groupsService: NxSystemGroupsService,
    ) { }

    ngOnInit(): void {
        combineLatest([this._groups$, this._systems$])
            .subscribe(([groups, systems]) => {
                this.systemNameOptions = systems.map(sys => ({
                    name: sys.name,
                    value: sys.id
                }));
                const selectedSystemRemoved = this.selectedSystem &&
                    !systems.find(sys => sys.id === this.selectedSystem.value);
                if (!this.selectedSystem || selectedSystemRemoved) {
                    this.selectedSystem = this.systemNameOptions[0];
                }

                this.groups = groups;
                this.generateTargetGroupOptions(this.selectedSystem.value);
            });

        this.moveSystemProcess = this.processService.createProcess(
            () => this.groupsService.setSystemGroup(
                this.selectedSystem.value,
                this.selectedGroup.value
            ),
            {},
            () => this.dialogRef.close()
        );
    }

    close = (): void => {
        this.dialogRef.close();
    };

    generateTargetGroupOptions(selectedSysId: string): void {
        this.targetGroupOptions = [];
        const currentParentGroup = this.groups.systemGroups[selectedSysId];
        if (currentParentGroup === undefined) {
            this.targetGroupOptions.push({ name: 'None (root)', value: null });
        }
        Object.entries<string>(this.groups.groupNames).forEach(([id, name]) => {
            if (currentParentGroup !== id) {
                this.targetGroupOptions.push({ name, value: id });
            }
        });
        const selectedGroupRemoved = this.selectedGroup &&
            !this.targetGroupOptions.find(opt =>
                opt.value === this.selectedGroup.value
            );
        if (!this.selectedGroup || selectedGroupRemoved) {
            this.selectedGroup = this.targetGroupOptions[0];
        }
    }
}
