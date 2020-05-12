import {
    Component, OnDestroy, OnInit, ViewEncapsulation
}                                   from '@angular/core';
import { NxRibbonService }          from './ribbon.service';
import { distinctUntilChanged }     from 'rxjs/operators';
import { Subscription }             from 'rxjs';
import { AutoUnsubscribe }          from 'ngx-auto-unsubscribe';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxUtilsService }           from '../../services/utils.service';

@AutoUnsubscribe()
@Component({
    selector     : 'nx-ribbon',
    templateUrl  : 'ribbon.component.html',
    styleUrls    : ['ribbon.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxRibbonComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    message: string;
    action: string;
    actionUrl: string;
    showRibbon: boolean;
    type: string;
    updateFunction;
    private ribbonSubscription: Subscription;

    private setupDefaults() {
        this.showRibbon = false;
        this.message = '';
        this.action = '';
        this.actionUrl = '';
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
        this.ribbonSubscription = this.ribbonService.contextSubject.pipe(
            distinctUntilChanged((contextA, contextB) => NxUtilsService.isEqual(contextA, contextB))
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
