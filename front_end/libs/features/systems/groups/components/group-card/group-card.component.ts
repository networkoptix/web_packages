import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

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

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private router: Router,
        private groupsService: NxSystemGroupsService,
    ) {
        this.LANG = language.translations;
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
