import { Component, Input }         from '@angular/core';
import { IConfig, NxConfigService } from '@services/nx-config';

import { ConsoleMode }              from '../console.component';
import { ConsoleSection } from '../table/console-table.component';

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

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
        this.showAdditionalLinks = ![
            ConsoleSection.CUSTOM_CLIENTS
        ].includes(this.sectionParam);
    }
}
