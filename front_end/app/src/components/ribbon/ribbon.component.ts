import { Component, OnDestroy, OnInit } from '@angular/core';
import { NxRibbonService } from './ribbon.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { Utils } from '../../utils/helpers';
import { NxConfigService } from '../../services/nx-config/nx-config.service';
import { IConfig } from '../../services/nx-config/config-types';

@AutoUnsubscribe()
@Component({
    selector: 'nx-ribbon',
    templateUrl: 'ribbon.component.html',
    styleUrls: ['ribbon.component.scss'],
})
export class NxRibbonComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    message: string;
    action: string;
    actionUrl: string;
    showRibbon: boolean;
    type: string;
    updateFunction: any;
    private ribbonSubscription: Subscription;

    private setupDefaults() {
        this.showRibbon = false;
        this.message = '';
        this.action = '';
        this.actionUrl = '';
        this.type = '';
        this.updateFunction = '';
    }

    constructor(configService: NxConfigService,
        private ribbonService: NxRibbonService) {
        this.CONFIG = configService.getConfig();
        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.ribbonSubscription = this.ribbonService.contextSubject.pipe(
            distinctUntilChanged((contextA, contextB) => Utils.isEqual(contextA, contextB))
        ).subscribe(context => {
            this.showRibbon = context.visibility || false;
            this.message = context.message || '';
            this.action = context.text || '';
            this.actionUrl = context.url || '';
            this.type = context.type || '';
            this.updateFunction = context.updateFunction || '';
        });
    }
}
