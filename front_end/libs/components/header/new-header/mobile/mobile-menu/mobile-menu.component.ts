import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { filter } from 'rxjs/operators';

import { accountDropdown, icons, images } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { AccountDropdown } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

@UntilDestroy()
@Component({
    selector: 'nx-mobile-menu',
    templateUrl: './mobile-menu.component.html',
    styleUrls: ['./mobile-menu.component.scss']
})
export class NxMobileHeaderMenuComponent {
  @Input() menuNodes: MenuNode[] = [];
  @Input() selectedNode: MenuNode;
  @Input() loggedIn: boolean = false;
  @Input() isProfile: boolean = false;
  @Output() nodeClicked = new EventEmitter<boolean>();
  profileMenu: MenuNode[];
  currentSystemMenu: MenuNode;
  showCurrentSystem = false;

  CONFIG: IConfig;
  icons: {
    dirHeader: string;
  };
  images: {
    dirHeader: string;
  };

  constructor(public headerService: NxHeaderService,
              private configService: NxConfigService,
              private accountService: NxAccountService,
              menusService: NxMenusService) {
      this.CONFIG = this.configService.getConfig();
      this.profileMenu = this.makeProfileMenu(accountDropdown);
      this.icons = icons;
      this.images = images;

      menusService.currentSystemNode$.pipe(filter(node => !!node), untilDestroyed(this)).subscribe(node => {
          if (headerService.currentLocation?.path?.includes('/systems/')) { // specific system page
              this.currentSystemMenu = cloneDeep({ ...node, name: 'systems' });
          }
      });

      headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
          this.showCurrentSystem = currentLocation?.path?.includes('/systems/');
      });
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
