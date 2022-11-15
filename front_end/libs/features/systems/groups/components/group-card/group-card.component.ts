import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import staticLang from '@common/language/language_i18n_static.json';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

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

    CONFIG: IConfig;
    LANG = staticLang;

    menuOpen: boolean = false;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private groupsService: NxSystemGroupsService,
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit(): void { }

    openGroup(): void {
        this.router.navigate(['systems', 'groups', this.group.id]);
    }

    deleteGroup(): void {
        this.groupsService.deleteGroup(this.group.id);
    }
}
