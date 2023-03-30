
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { CoercedBoolInput } from '@decorators/ibool';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@src/app/variables/static-variables';

import { GroupsItem, SharedItems, BaseItems, OpenGroups, GroupPath } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups.actions';
import { selectRootPersonalItems, selectRootSharedItems } from '../../store/groups.selectors';

@Component({
    selector: 'nx-groups-sidebar',
    templateUrl: 'sidebar.component.html',
    styleUrls: ['sidebar.component.scss'],
})
export class NxSystemGroupsSidebarComponent implements OnInit {
    @Input() currentGroupId: string;
    @Input() currentGroupOwner: string;
    @Input() showPersonal: CoercedBoolInput = true;
    @Input() openGroups: OpenGroups;
    @Input() hasGroups: CoercedBoolInput;
    @Input() userEmail: string;
    @Input() currentPath: GroupPath[];
    @Output() dismiss = new EventEmitter<void>();

    sharedSidebarItems$ = this.store.select<SharedItems>(selectRootSharedItems);
    personalSidebarItems$ = this.store.select<BaseItems>(selectRootPersonalItems);
    icons = icons;
    LANG = staticLang;

    constructor(
      private groupsService: NxSystemGroupsService,
      private dialogsService: NxDialogsService,
      private store: Store
    ) {}

    ngOnInit(): void {
        // Opens all nested groups upon loading a group page
        const initialOpenGroups: OpenGroups = {};

        if (!this.showPersonal) {
            initialOpenGroups[this.currentGroupOwner] = true;
        }

        for (const group of this.currentPath) {
            initialOpenGroups[group.id] = true;
        }

        this.store.dispatch(GroupActions.setOpenGroups({ openGroups: initialOpenGroups }));
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        this.groupsService.onDrop(event.item.data, null);
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup({
            targetId: this.currentGroupId,
            parentGroup: null,
            hasGroups: false
        });
    }
}
