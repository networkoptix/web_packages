/* eslint-disable camelcase */
import { Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { Auth, MenuNode } from '@services/menus.service.types';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSessionService } from '@services/session.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-navigation-tile',
    templateUrl: 'navigation-tile.component.html',
    styleUrls: ['navigation-tile.component.scss']
})
export class NxNavigationTileComponent {
    @Input() node: MenuNode;
    @Input() width = 240;
    CONFIG: IConfig;
    iconsDir: string;
    authState: Auth = Auth.LOGGED_OUT;
    loginStateSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        private sessionService: NxSessionService,
        public headerService: NxHeaderService
    ) {
        this.CONFIG = configService.config;
        this.iconsDir = this.CONFIG.icons.dir;
    }

    ngOnInit() {
        this.loginStateSubscription =
            this.sessionService.loginStateSubject.subscribe(_ => {
                this.authState = this.sessionService.email
                    ? Auth.LOGGED_IN
                    : Auth.LOGGED_OUT;
            });

        this._setupIds();
    }

    ngOnDestroy() {}

    checkActive(node) {
        const { childNode } = this.headerService.currentLocation;
        const { url } = node;
        const breadcrumbUrls =
            (childNode?.breadcrumbs || [])
                .map(({ url }) => url).filter(url => url);
        return breadcrumbUrls.includes(url);
    }

    protected _setupIds () {
        this.node.htmlID = this._generateNodeId(this.node);
        this.node.nodes.map(link => {
            link.htmlID = this._generateLinkId(this.node, link);
        });
    }

    protected _handleName (name) {
        return name.toLocaleLowerCase().split(' ').join('-');
    }

    protected _generateNodeId (node) {
        return 'header-navigation--' + this._handleName(node.name);
    }

    protected _generateLinkId (node, link) {
        const name = this._handleName(link.name);
        return this._generateNodeId(node) + '--' + name;
    }
}
