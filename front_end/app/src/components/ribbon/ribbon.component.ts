import {
    Component, OnDestroy, OnInit, ViewEncapsulation
}                                   from '@angular/core';
import { NxRibbonService }          from './ribbon.service';
import { distinctUntilChanged }     from 'rxjs/operators';
import { Subscription }             from 'rxjs';
import { UntilDestroy }             from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxUtilsService }           from '../../services/utils.service';
import { Process }         from '../../services/process.service';

export interface RibbonAction {
    type: 'link' | 'process-button',
    text: string,
    value: string | Process;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector     : 'nx-ribbon',
    templateUrl  : 'ribbon.component.html',
    styleUrls    : ['ribbon.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxRibbonComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    message: string;
    actions: RibbonAction[];
    showRibbon: boolean;
    type: string;
    updateFunction;
    private ribbonSubscription: Subscription;

    private setupDefaults() {
        this.showRibbon = false;
        this.message = '';
        this.actions = [];
        this.type = '';
        this.updateFunction = '';
    }

    constructor(
        configService: NxConfigService,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
        this.setupDefaults();
    }

    ngOnDestroy() {
    }

    ngOnInit() {
        this.ribbonSubscription = this.ribbonService.contextSubject.subscribe(context => {
            this.showRibbon = context.visibility || false;
            this.message = context.message || '';
            this.actions = context.actions || [];
            this.type = context.type || '';
            this.updateFunction = context.updateFunction || '';
        });
    }
}
