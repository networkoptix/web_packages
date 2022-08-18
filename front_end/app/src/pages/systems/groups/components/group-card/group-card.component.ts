import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import type { GroupItem } from '../../groups.types';

@Component({
    selector: 'nx-group-card',
    templateUrl: 'group-card.component.html',
    styleUrls: [
        '../../../../../components/system-card/system-card.component.scss',
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
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {}

    openGroup(): void {
        // TODO: Navigate without load (authguard)
        this.router.navigate(['systems', 'groups', this.group.id]);
    }
}
