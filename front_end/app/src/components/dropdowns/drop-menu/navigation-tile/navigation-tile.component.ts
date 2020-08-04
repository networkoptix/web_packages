/* eslint-disable camelcase */
import { Component, Input } from '@angular/core';
import { Router }           from '@angular/router';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { NxSessionService }         from '../../../../services/session.service';
import { NxHeaderService }          from '../../../../services/nx-header.service';
import { Auth }                     from '../../../../services/menus.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-navigation-tile',
    templateUrl : 'navigation-tile.component.html',
    styleUrls   : ['navigation-tile.component.scss']
})
export class NxNavigiationTileComponent {
    @Input() node: MenuNode;
    @Input() width = 240;
    CONFIG: IConfig;
    iconsDir: string;
    authState: Auth = Auth.LOGGED_OUT;
    loginStateSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private sessionService: NxSessionService,
        public headerService: NxHeaderService
    ) {
        this.CONFIG = configService.config;
        this.iconsDir = this.CONFIG.icons.dir;
    }

    ngOnInit() {
        this.loginStateSubscription = this.sessionService.loginStateSubject.subscribe(_ => {
            this.authState = this.sessionService.email ? Auth.LOGGED_IN : Auth.LOGGED_OUT;
        });
    }

    ngOnDestroy() {}
};

export class MenuNode {
    public icon?: string;
    public currentRoute?: boolean;
    constructor(
        public name = '',
        public url: string,
        icon = '',
        public nodes?: MenuNode[],
        public authentication: Auth = Auth.BOTH,
        public display_name = name,
        public new_window = false,
        currentRoute = false
    ) {
        this.icon = icon;
        this.currentRoute = currentRoute;
    }
};
