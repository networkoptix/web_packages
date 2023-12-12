import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxAccountSettingsDropdown } from '@components/dropdowns/account-settings/account-settings.component';
import { LanguageModule } from '@components/dropdowns/language/language.module';
import staticLang from '@language_static';
import { NxMenusService } from '@services/menus.service';
import type { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-header-level-one',
    templateUrl: './header-level-one.component.html',
    styleUrls: ['./header-level-one.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxAccountSettingsDropdown, LanguageModule],
})
export class NxHeaderLevelOneComponent {
    @Input() menuNodes: MenuNode[] = [];
    @Input() selectedNode: MenuNode;
    @Input() noSystems: boolean;
    @Input() loggedIn: boolean | undefined = undefined;
    @Output() nodeSelect = new EventEmitter<MenuNode>();
    profileDropdownOpen = false;
    LANG = staticLang;

    constructor(
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
    ) {}

    onNodeSelect(node: MenuNode, event: MouseEvent): false {
        this.handleNavigation(node, event);
        this.nodeSelect.emit(node);
        return false;
    }

    handleNavigation(node: MenuNode, event: MouseEvent): void {
        const firstNodeWithURL = node.nodes.find(
            subNode => subNode.url !== undefined && !subNode.new_window,
        );
        if (firstNodeWithURL) {
            let navNode = firstNodeWithURL;
            if (firstNodeWithURL.url === '/systems') {
                if (this.menusService.currentSystemNode$.value) {
                    navNode = this.menusService.currentSystemNode$.value;
                }
            }
            this.headerService.handleNav(navNode, event);
        }
    }
}
