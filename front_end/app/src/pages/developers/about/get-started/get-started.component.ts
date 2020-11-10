import { Component, Input, Inject, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DOCUMENT }                 from '@angular/common';
import { UntilDestroy }             from '@ngneat/until-destroy';

import { NxUtilsService } from '../../../../services/utils.service';
import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-get-started',
    templateUrl : 'get-started.component.html',
    styleUrls   : ['get-started.component.scss']
})
export class NxGetStartedComponent implements OnChanges {
    @Input() getStartedNode: AboutNode;
    CONFIG: IConfig;
    steps: AboutNode;

    constructor(configService: NxConfigService, @Inject(DOCUMENT) private document: Document) {
        this.CONFIG = configService.config;
    }

    ngOnChanges(changes: SimpleChanges): void {
        const getStartedNode = NxUtilsService.deepCopy(changes.getStartedNode.currentValue);
        getStartedNode.nodes.forEach(step => {
            const images = step.icon.split(' ');
            step.icon = images[0];
            step.aniIcon = images[1];
            step.currentIcon = step.icon;
        });
        this.steps = getStartedNode;
    }

    // slideUp(wrapperId) {
    //     this.document.getElementById(wrapperId).classList.add('slide-up');
    // }
    //
    // slideBack(wrapperId) {
    //     this.document.getElementById(wrapperId).classList.remove('slide-up');
    // }
}
