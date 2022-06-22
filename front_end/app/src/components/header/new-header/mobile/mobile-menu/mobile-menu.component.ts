import { Component, EventEmitter, Input, Output } from '@angular/core';

import { NxAccountService } from '@services/account.service';
import { MenuNode } from '@services/menus.service.types';
import { AccountDropdown } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-mobile-menu',
    templateUrl: './mobile-menu.component.html',
    styleUrls: ['./mobile-menu.component.scss']
})
export class NxMobileHeaderMenuComponent {
  @Input() menuNodes: MenuNode[] = [];
  @Input() selectedNode: MenuNode;
  @Input() loggedIn = false;
  @Input() isProfile = false;
  @Output() nodeClicked = new EventEmitter<Boolean>();
  profileMenu: MenuNode[];

  CONFIG: IConfig;

  constructor(public headerService: NxHeaderService,
              private configService: NxConfigService,
              private accountService: NxAccountService) {
      this.CONFIG = this.configService.getConfig();
      this.profileMenu = this.makeProfileMenu(this.CONFIG.accountDropdown);
  }

  nodeClick(node: MenuNode, event: any): void {
      this.headerService.handleNav(node, event);
      this.nodeClicked.emit(true);
  }

  makeProfileMenu(dropdownItems: AccountDropdown[]): MenuNode[] {
      const menu = [];
      for (const item of dropdownItems) {
          menu.push(new MenuNode(item.name, item.route, item.name));
      }
      return menu;
  }

  logout(): void {
      this.accountService.logout(false);
  }
}
