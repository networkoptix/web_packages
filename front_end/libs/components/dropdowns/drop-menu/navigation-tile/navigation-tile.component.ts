/* eslint-disable camelcase */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { SubscriptionLike } from 'rxjs';

import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { icons } from '@static-variables';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-navigation-tile',
    templateUrl: 'navigation-tile.component.html',
    styleUrls: ['navigation-tile.component.scss'],
    imports: [CommonModule, RouterModule, AngularSvgIconModule],
    standalone: true,
})
export class NxNavigationTileComponent {
    @Input() node: MenuNode;
    @Input() width = 240;
    icons = icons;
    iconsDir: string;
    loginStateSubscription: SubscriptionLike;

    constructor(public headerService: NxHeaderService) {
        this.iconsDir = icons.dir;
    }

    ngOnInit(): void {
        this._setupIds();
    }

    checkActive(node) {
        const { childNode } = this.headerService.currentLocation;
        const { url } = node;
        const breadcrumbUrls = (childNode?.breadcrumbs || [])
            .map(({ url }) => url)
            .filter(url => url);
        return breadcrumbUrls.includes(url);
    }

    protected _setupIds(): void {
        this.node.htmlID = this._generateNodeId(this.node);
        this.node.nodes.forEach(link => {
            link.htmlID = this._generateLinkId(this.node, link);
        });
    }

    protected _handleName(name) {
        return name.toLocaleLowerCase().split(' ').join('-');
    }

    protected _generateNodeId(node) {
        return 'header-navigation--' + this._handleName(node.name);
    }

    protected _generateLinkId(node, link) {
        const name = this._handleName(link.name);
        return this._generateNodeId(node) + '--' + name;
    }
}
