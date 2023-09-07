import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuItem } from '@components/context-menu/context-menu.types';
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
export class NxContextMenu<Context> {
    static POSITIONS: { [key: string]: ConnectedPosition[] } = {
        default: [{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }],
    };

    @Input() subMenu: boolean = false;
    @Input() context: Context;
    @Input() menuItems: MenuItem<Context>[];
    protected readonly icons = icons;
}
