import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import type { GroupItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups.actions';

@Component({
    selector: 'nx-group-card',
    templateUrl: 'group-card.component.html',
    styleUrls: [
        '../system-card/system-card.component.scss',
        'group-card.component.scss',
    ]
})
export class NxGroupCardComponent {
    @Input() group: GroupItem;
    @Input() search: string = '';

    LANG = staticLang;
    icons = icons;

    constructor(
        private router: Router,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
        private store: Store
    ) {
    }

    openGroup(): void {
        this.router.navigate(['groups', this.group.id])
            .then(() => this.store.dispatch(GroupActions.setCurrentSharedOwner({ currentSharedOwner: null })));
    }

    deleteGroup(): void {
        this.groupsService.deleteGroup(this.group.id);
    }

    addGroup(): void {
        this.dialogsService.createSystemGroup(this.group.id, this.group.name);
    }
}
