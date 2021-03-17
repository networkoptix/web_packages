import { Component, Inject, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed }     from '@ngneat/until-destroy';
import { WINDOW } from '@services/window-provider';
import { fromEvent, merge } from 'rxjs';

import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-capabilities',
    templateUrl : 'capabilities.component.html',
    styleUrls   : ['capabilities.component.scss']
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesNode: AboutNode;

    CONFIG: IConfig;
    errorManager: ErrorStateManager;
    minHeaderHeight = 0;

    setMinHeight({ height }) {
        setTimeout(() => {
            this.minHeaderHeight = Math.max(this.minHeaderHeight, height + 32);
        }, 10);
    }

    constructor(
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit() {
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'subtitle', 'displayName', 'icon'],
                null,
                this.errorManager.buildConfig(
                    ['title', 'shortDescription', 'blocks']
                ))
        );
        this.errorManager.checkAboutNode(
            this.capabilitiesNode,
            capabilitiesConfig
        );
        const resize$ = fromEvent(window, 'resize');
        const orientation$ = fromEvent(window, 'orientationchange');
        merge(resize$, orientation$).pipe(
            untilDestroyed(this)
        ).subscribe(_ => {
            this.minHeaderHeight = 0;
        });
    }
};
