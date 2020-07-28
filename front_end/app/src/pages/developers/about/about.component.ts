import { Component, Input } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { DevToolBlock }     from '../dev-tools/dev-tools.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-about',
    templateUrl : 'about.component.html',
    styleUrls   : ['about.component.scss']
})
export class NxAboutComponent {
    @Input() heading: string = 'Develop with %CLOUD_NAME%';
    @Input() lead: string = '%CLOUD_NAME% is an extensible IP Video Development Platform created for software developers who want to create new Powered-by-%VMS_NAME% products and scalable integrations.'
    @Input() devTools: DevToolBlock[] = mockTools;
};

export const mockTools = [
    new DevToolBlock('Server Plugin SDK (C++)', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Server HTTP REST API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Cloud API', 'User-friendly and flexible networked access control system, designed to make the management of any building incredibly simple.', '/developers/', 'servers.svg'),
    new DevToolBlock('Other Tools', '', '/developers/dev-tools', 'servers.svg')
];
