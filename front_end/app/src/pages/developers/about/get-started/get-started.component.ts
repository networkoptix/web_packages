import { Component, Input, Inject, Output, EventEmitter } from '@angular/core';
import { DOCUMENT }                 from '@angular/common';
import { UntilDestroy }             from '@ngneat/until-destroy';

import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-get-started',
    templateUrl : 'get-started.component.html',
    styleUrls   : ['get-started.component.scss']
})
export class NxGetStartedComponent {
    @Input() getStartedNode: AboutNode;
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
