import { Component } from '@angular/core';
import { IConfig, NxConfigService } from '@services/nx-config';

export interface ConsoleMenuNode {
    title: string,
    url: string,
    icon: string
}

export const mockMenuContent: ConsoleMenuNode[] = [
    {
        title : 'Some Section',
        url   : 'some-section-url',
        icon  : 'menu.svg'
    },
    {
        title : 'Another Section',
        url   : 'another-section-url',
        icon  : 'lock.svg'
    },
    {
        title : 'Custom VMS Clients',
        url   : 'custom-clients',
        icon  : 'servers.svg'
    },
    {
        title : 'Last Section',
        url   : 'last-section-url',
        icon  : 'users.svg'
    }
];

@Component({
    selector    : 'console-menu',
    templateUrl : 'console-menu.component.html',
    styleUrls   : ['console-menu.component.scss']
})
export class NxDevConsoleMenuComponent {
    CONFIG: IConfig

    menu: ConsoleMenuNode[]
    base = '/developers'

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
        this.menu = mockMenuContent;
    }
}
