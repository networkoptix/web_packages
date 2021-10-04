import { Component, Input, SimpleChanges }        from '@angular/core';
import { IConfig, NxConfigService }               from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';

import { ConsoleMode }    from '@pages/developer-console/console/console.component';
import { ConsoleSection } from '@components/console-table/console-table.component';

export interface ConsoleMenuNode {
    title: string,
    url: string,
    icon?: string
}

@Component({
    selector    : 'console-menu',
    templateUrl : 'console-menu.component.html',
    styleUrls   : ['console-menu.component.scss']
})
export class NxDevConsoleMenuComponent {
    @Input() menu: ConsoleMenuNode[];
    @Input() base: string;
    @Input() type: ConsoleMode;
    @Input() sectionParam: ConsoleSection;

    CONFIG: IConfig;
    TYPES = ConsoleMode

    showAdditionalLinks = false;
    loading = true;

    constructor(
        configService: NxConfigService,
        private headerService: NxHeaderService
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
        this.showAdditionalLinks = ![
            ConsoleSection.CUSTOM_CLIENTS
        ].includes(this.sectionParam);
    }

    ngOnChanges(changes: SimpleChanges) {
        const {
            menu         : { currentValue: menu }
        } = changes;

        const { parentNode } = this.headerService.currentLocation;
        for (const section in this.CONFIG.manifest) {
            const sectionConfig = this.menu.find(({ url }) => url === section);
            if (sectionConfig) {
                const cmsTitle = parentNode.nodes.find(({ url }) => (url.startsWith('/') ? url : '/' + url) === `${this.base}/${sectionConfig.url}`)?.name;
                sectionConfig.title = cmsTitle || sectionConfig.title;
            }
        }

        this.loading = !menu.length;
    }
}

export const forUnitTest = {
    NxHeaderService,
    NxConfigService,
    ConsoleMode
};
