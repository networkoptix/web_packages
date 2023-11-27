import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuItem, MenuItemsFactoryCallback } from '@components/context-menu/context-menu.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-context-menu',
    styleUrls: ['./context-menu.scss'],
    templateUrl: './context-menu.html',
    standalone: true,
    imports: [
        CommonModule,
        PortalModule,
        CdkMenu,
        CdkMenuItem,
        TranslateModule,
        MatDividerModule,
        CdkMenuTrigger,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
    ],
})
export class NxContextMenu<Context> implements OnInit {
    static POSITIONS: { [key: string]: ConnectedPosition[] } = {
        default: [{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }],
    };

    @Input() isSubMenu: boolean = false;
    @Input() context: Context;
    @Input() menuItems: MenuItemsFactoryCallback<Context> | MenuItem<Context>[];

    @HostListener('document:fullscreenchange')
    closeMenuOnFullscreenChange(): void {
        this.menu = undefined;
    }

    menu: MenuItem<Context>[] | undefined;
    protected readonly icons = icons;

    async ngOnInit(): Promise<void> {
        if (typeof this.menuItems === 'function') {
            const menu = this.menuItems(this.context);
            if (Array.isArray(menu)) {
                this.menu = menu;
            } else {
                this.menu = await menu;
            }
        } else {
            this.menu = this.menuItems;
        }
    }
}
