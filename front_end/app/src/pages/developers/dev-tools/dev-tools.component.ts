import { Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../services/nx-config';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-dev-tools',
    templateUrl : 'dev-tools.component.html',
    styleUrls   : ['dev-tools.component.scss']
})
export class NxDevToolsComponent {
    @Input() devToolsLink: string = '/developers/dev-tools';
    @Input() devToolsHeading: string;
    @Input() devTools: DevToolBlock[] = mockTools;

    CONFIG: IConfig;
    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }
};

export class DevToolBlock {
    constructor(
        public name: string,
        public body: string,
        public link: string,
        public icon: string
    ) {}
}
export const mockTools = [
    new DevToolBlock('Server Plugin SDK (C++)', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server HTTP REST API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Cloud API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server Plugin SDK (C++)', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server HTTP REST API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Cloud API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server Plugin SDK (C++)', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server HTTP REST API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server Plugin SDK (C++)', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server HTTP REST API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Cloud API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg')
];
