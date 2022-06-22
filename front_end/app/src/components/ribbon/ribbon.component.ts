import {
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

import { NxRibbonService } from './ribbon.service';
import type { RibbonAction } from './ribbon.types';

@UntilDestroy()
@Component({
    selector: 'nx-ribbon',
    templateUrl: 'ribbon.component.html',
    styleUrls: ['ribbon.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxRibbonComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    message: string;
    actions: RibbonAction[];
    visibility: boolean;
    type: string;
    updateFunction;

    private setupDefaults(): void {
        this.visibility = false;
        this.message = '';
        this.actions = [];
        this.type = '';
        this.updateFunction = '';
    }

    get showRibbon() {
        return this.visibility;
    }

    constructor(
        configService: NxConfigService,
        private ribbonService: NxRibbonService,
        public headerService: NxHeaderService
    ) {
        this.CONFIG = configService.getConfig();
        this.setupDefaults();
    }

    ngOnDestroy(): void {
    }

    ngOnInit(): void {
        this.ribbonService.contextSubject
            .pipe(untilDestroyed(this))
            .subscribe(context => {
                this.visibility = context.visibility || false;
                this.message = context.message || '';
                this.actions = context.actions || [];
                this.type = context.type || '';
                this.updateFunction = context.updateFunction || '';
            });
    }
}
