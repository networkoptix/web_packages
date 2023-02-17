import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import type { GroupItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

@Component({
    selector: 'nx-group-card',
    templateUrl: 'group-card.component.html',
    styleUrls: [
        '../system-card/system-card.component.scss',
        'group-card.component.scss',
    ]
})
export class NxGroupCardComponent implements OnInit {
    @Input() group: GroupItem;
    @Input() search: string = '';

    LANG = staticLang;
    icons = icons;

    constructor(
        private router: Router,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService
    ) {}

    ngOnInit(): void {}

    openGroup(): void {
        this.router.navigate(['groups', this.group.id]);
    }

    deleteGroup(): void {
        this.groupsService.deleteGroup(this.group.id);
    }

    addGroup(): void {
        this.dialogsService.createSystemGroup(this.group.id, this.group.name);
    }
}
