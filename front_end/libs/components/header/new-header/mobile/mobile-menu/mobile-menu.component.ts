import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep } from 'lodash-es';
import { filter } from 'rxjs/operators';

import { accountDropdown } from '@components/static-variables-components';
import staticLang from '@language_static';
import { toggleSecondaryMenuEvent } from '@libs/nx-components/src/lib/theme-provider/events';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { AccountDropdown } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';
import { icons, images } from '@static-variables';
import { useNewCloud } from '@utils/general';

@UntilDestroy()
@Component({
    selector: 'nx-mobile-menu',
    templateUrl: './mobile-menu.component.html',
    styleUrls: ['./mobile-menu.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, AngularSvgIconModule],
})
export class NxMobileHeaderMenuComponent {
    @Input() menuNodes: MenuNode[] = [];
    @Input() selectedNode: MenuNode;
    @Input() loggedIn: boolean = false;
    @Input() isProfile: boolean = false;
    @Input() isTablet: boolean = false;
    @Input() systemCount: number = 0;
    @Output() nodeClicked = new EventEmitter<boolean>();
    profileMenu: MenuNode[];
    LANG = staticLang;
    currentSystemMenu: MenuNode;
    showCurrentSystem = false;
    useNewCloud = useNewCloud();

    get loginRedirectParams(): { redirect_uri?: string } {
        return {
            redirect_uri:
                new URL(window.location.href).searchParams.get('redirect_uri') ||
                window.location.href,
        };
    }

    CONFIG: IConfig;
    icons: {
        dirHeader: string;
    };
    images: {
        dirHeader: string;
    };

    location = window.location;

    constructor(
        public headerService: NxHeaderService,
        private configService: NxConfigService,
        private accountService: NxAccountService,
        systemsService: NxSystemsService,
        menusService: NxMenusService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.profileMenu = this.makeProfileMenu(accountDropdown);
        this.icons = icons;
        this.images = images;

        menusService.currentSystemNode$
            .pipe(
                filter(node => !!node),
                untilDestroyed(this),
            )
            .subscribe(node => {
                if (headerService.currentLocation?.path?.includes('/systems/')) {
                    // specific system page
                    this.currentSystemMenu = cloneDeep({ ...node, name: 'systems' });
                }
            });

        headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            this.showCurrentSystem = currentLocation.isSystem;

            if (this.showCurrentSystem) {
                this.currentSystemMenu = cloneDeep(currentLocation.parentNode);
            }
        });
    }

    closeSidebar(): void {
        window.dispatchEvent(toggleSecondaryMenuEvent());
    }

    nodeClick(node: MenuNode, event: MouseEvent): void {
        this.headerService.handleNav(node, event);
        this.nodeClicked.emit(true);
    }

    makeProfileMenu(dropdownItems: AccountDropdown[]): MenuNode[] {
        const menu: MenuNode[] = [];
        for (const item of dropdownItems) {
            menu.push(new MenuNode(item.name, item.route, item.name));
        }
        return menu;
    }

    logout(): void {
        this.accountService.logout(false);
    }
}
