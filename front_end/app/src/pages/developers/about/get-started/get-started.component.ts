import { Component, Input, Inject } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { DOCUMENT } from '@angular/common';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-get-started',
    templateUrl : 'get-started.component.html',
    styleUrls   : ['get-started.component.scss']
})
export class NxGetStartedComponent {
    @Input() heading: string = "Get Started!"
    @Input() blocks: GetStartedBlock[] = mockBlocks

    CONFIG: IConfig;

    constructor(configService: NxConfigService, @Inject(DOCUMENT) private document: Document) {
        this.CONFIG = configService.config;
    }
    
    slideUp(wrapperId) {
        this.document.getElementById(wrapperId).classList.add('slide-up');
    }

    slideBack(wrapperId) {
        this.document.getElementById(wrapperId).classList.remove('slide-up');
    }
};

export class GetStartedBlock {
    constructor(
        public step: number,
        public lead: string,
        public link: string,
        public description: string,
        public icon: string
    ){}
}

const mockBlocks = [
    new GetStartedBlock(1, 'Get a Build', '/developers/', 'For any Platform', 'users.svg'),
    new GetStartedBlock(2, 'Get a License', '/developers/', 'Special for Developers', 'users.svg'),
    new GetStartedBlock(3, 'Explore Architecture', '/developers/', 'Learn about components', 'users.svg'),
    new GetStartedBlock(4, 'Read Knowledgebase', '/developers/', 'Documentation and Samples', 'users.svg')
];