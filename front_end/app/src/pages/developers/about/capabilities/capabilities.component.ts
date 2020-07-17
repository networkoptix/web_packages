import { Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { IConfig, NxConfigService } from '../../../../services/nx-config';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-capabilities',
    templateUrl : 'capabilities.component.html',
    styleUrls   : ['capabilities.component.scss']
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesHeading: string = 'What is possible?';
    @Input() capabilitiesLink: string = '/developers/about'
    @Input() capabilities: CapabilitiesBlock[] = mockCapabilities;

    @Input() supportedTechHeading: string = 'Supported Tech';
    @Input() supportedTechLink: string = '/developers/about';
    @Input() supportedTech: SupportedTech[] = mockTech;
    @Input() supportedLanguages: SupportedTech[] = mockLanguages;

    CONFIG: IConfig;
    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }
};

export class CapabilitiesBlock {
    constructor(
        public introLine: string,
        public heading: string,
        public link: string,
        public body: string,
        public icon: string,
        public headerImage: string,
        public headerColor: string = '#2B383F'
    ) {}
}

export class SupportedTech {
    constructor(
        public name: string,
        public link: string,
        public icon?: string
    ) {}
}

export const mockCapabilities = [
    new CapabilitiesBlock('creating', 'Custom Solutions', '/developers/', 'Add components, customize, and integrate your VMS to satisfy custom project requirements.', 'users.svg', 'https://www.networkoptix.com/wp-content/uploads/2018/10/World-MAP.png'),
    new CapabilitiesBlock('creating', 'New Products', '/developers/', 'Create your own Powered-by-%VMS_NAME% product and instantly get all professional VMs features.', 'services.svg', 'https://www.networkoptix.com/wp-content/uploads/2018/10/World-MAP.png'),
    new CapabilitiesBlock('creating', 'Scalable Integration', '/developers/', 'Integrate your product or service with the platform to reach a large existing customer base.', 'systems.svg', 'https://www.networkoptix.com/wp-content/uploads/2018/10/World-MAP.png')
];

export const mockTech = ['Mac', 'Ubuntu', 'Windows', 'Android', 'Docker', "Arm", "VMware"].map(name => new SupportedTech(name, '/developers/about/','systems.svg'));

export const mockLanguages = ['C++', 'Node.js', '.NET, C#', 'Python', 'JavaScript/TypeScript', 'and Others'].map(name=> new SupportedTech(name, '/developers/about/'));