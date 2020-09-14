import { Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { AboutNode } from '../about/about.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-dev-tools',
    templateUrl : 'dev-tools.component.html',
    styleUrls   : ['dev-tools.component.scss']
})
export class NxDevToolsComponent {
    @Input() devToolsNode: AboutNode;

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
