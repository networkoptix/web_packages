import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConsoleSection } from '@components/console-table/console-table.component.types';
import { icons, manifest } from '@lib/variables/static-variables';
import { ConsoleMode } from '@pages/developer-console/console/console.types';
import { NxMenusService } from '@services/menus.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

import type { ConsoleMenuNode } from './console-menu.component.types';

@UntilDestroy()
@Component({
    selector: 'nx-console-menu',
    templateUrl: 'console-menu.component.html',
    styleUrls: ['console-menu.component.scss'],
})
export class NxDevConsoleMenuComponent {
    @Input() menu: ConsoleMenuNode[];
    @Input() base: string;
    @Input() type: ConsoleMode;
    @Input() sectionParam: ConsoleSection;

    CONFIG: IConfig;
    TYPES = ConsoleMode;

    showAdditionalLinks = false;
    loading = true;
    cancel$ = new Subject<'cancel'>();
    icons = icons;

    constructor(configService: NxConfigService, private menusService: NxMenusService) {
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {
        this.showAdditionalLinks = ![ConsoleSection.CUSTOM_CLIENTS].includes(this.sectionParam);
    }

    ngOnChanges(changes: NgChanges<NxDevConsoleMenuComponent>): void {
        const {
            menu: { currentValue: menu },
        } = changes;
        this.cancel$.next('cancel');

        this.menusService
            .getMenu('configuration')
            .pipe(untilDestroyed(this), takeUntil(this.cancel$))
            .subscribe(config => {
                const consoleCmsConfig = (config?.nodes || []).find(({ url }) => url === this.base);
                for (const section in manifest) {
                    const sectionConfig = this.menu.find(({ url }) => url === section);
                    if (sectionConfig) {
                        const cmsTitle = consoleCmsConfig.nodes.find(
                            ({ url }) =>
                                (url.startsWith('/') ? url : '/' + url) ===
                                `${this.base}/${sectionConfig.url}`,
                        )?.name;
                        sectionConfig.title = cmsTitle || sectionConfig.title;
                    }
                }

                this.loading = !menu.length;
            });
    }
}
