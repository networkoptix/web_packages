import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import type { MenuNode } from '@services/menus.service.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-mobile-menu',
    templateUrl: './mobile-menu.component.html',
    styleUrls: ['./mobile-menu.component.scss']
})
export class NxMobileHeaderMenuComponent implements OnInit {
  @Input() menuNodes: MenuNode[] = [];
  @Input() selectedNode: MenuNode;
  @Output() nodeClicked = new EventEmitter<Boolean>();

  CONFIG: IConfig;

  constructor(public headerService: NxHeaderService, private configService: NxConfigService) {
      this.CONFIG = this.configService.getConfig();
  }

  ngOnInit(): void {
  }

  nodeClick(node: MenuNode, event: any): void {
      this.headerService.handleNav(node, event);
      this.nodeClicked.emit(true);
  }
}
