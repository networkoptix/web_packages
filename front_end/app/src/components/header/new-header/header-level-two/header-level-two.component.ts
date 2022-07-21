import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NgChanges } from '@utils/ng-changes';

import { logoAreaState, logoClickType } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-level-two',
    templateUrl: './header-level-two.component.html',
    styleUrls: ['./header-level-two.component.scss']
})
export class NxHeaderLevelTwoComponent {
    @ViewChild('menuItems', { static: true }) menuItemsRef: ElementRef<HTMLElement>;
    @ViewChild('contextButton') contextButtonRef: ElementRef<HTMLElement>;
    @Input() subNodes: MenuNode[];
    @Output() systemNav = new EventEmitter<boolean>();
    CONFIG: IConfig;
    logoState = logoAreaState.LOGO;
    menuItemsWidth: number;
    navArrowState = {
        visible: false,
        left: false,
        right: true
    };
    controlButtonVisible = true;
    sizeConstants = {
        logoAreaWidth: 256,
        margins: 25
    };
    contextButtonWidth = 0;
    optimisticSelectedSubNode: MenuNode; // The selected node is typically controlled by the headerServices currentLocation,
    // but this property is used to make the UI smooth when navigating between nodes while the currentLocation is changing

    constructor(configService: NxConfigService,
                public headerService: NxHeaderService,
                private menusService: NxMenusService,
                private scrollMechanics: NxScrollMechanicsService) {
        this.CONFIG = configService.getConfig();
        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            let newLogoState = logoAreaState.LOGO;
            if (currentLocation?.path === '/systems') {
                newLogoState = logoAreaState.SYSTEMS;
            } else if (this.headerService.activeSystem && currentLocation?.path?.includes('/systems/')) {
                newLogoState = logoAreaState.SYSTEM;
            }
            this.logoState = newLogoState;
        });

        this.scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(size => {
            this.contextButtonWidth = this.getContextButtonWidth();
            const { logoAreaWidth, margins } = this.sizeConstants;
            this.menuItemsWidth = size.width - logoAreaWidth - this.contextButtonWidth - margins;
            this.checkNavArrowsVisible(true);
        });
    }

    handleLogoClick(clickType: logoClickType): void {
        if (clickType === 'system') {
            this.menusService.updateActiveSystemMenu(this.headerService.activeSystem);
            this.subNodes = this.menusService.currentSystemNode$?.value?.nodes;
        }
        if (clickType === 'systems-list') {
            this.systemNav.emit(true);
        }
    }

    getContextButtonWidth() {
        if (this.contextButtonRef?.nativeElement) {
            return this.contextButtonRef.nativeElement.getBoundingClientRect().width;
        }
        return 0;
    }

    scrollMenuItems(direction: 'left' | 'right'): void {
        const menuItemsEl = this.menuItemsRef.nativeElement;
        const scrollDistance = 300;
        const changedScroll = direction === 'right' ? scrollDistance : (-1 * scrollDistance);
        const maxScrollLeft = menuItemsEl.scrollWidth - menuItemsEl.clientWidth;
        const newScroll = Math.max(menuItemsEl.scrollLeft + changedScroll, 0);
        menuItemsEl.scrollLeft = newScroll;
        this.navArrowState.left = newScroll !== 0;
        this.navArrowState.right = newScroll < maxScrollLeft;
    }

    checkNavArrowsVisible(checkLeft = false): void {
        setTimeout(() => {
            const menuItemsEl = this.menuItemsRef?.nativeElement;
            if (menuItemsEl) {
                this.navArrowState.visible = menuItemsEl.scrollWidth > menuItemsEl.clientWidth;
                this.navArrowState.right = menuItemsEl.scrollLeft !== (menuItemsEl.scrollWidth - menuItemsEl.clientWidth);
                if (checkLeft) {
                    this.navArrowState.left = menuItemsEl.scrollLeft !== 0;
                }
            }
        }, 0);
    }

    ngAfterViewInit(): void {
        this.checkNavArrowsVisible();
        this.contextButtonWidth = this.getContextButtonWidth();
        this.menuItemsWidth = this.menuItemsWidth - this.contextButtonWidth;
    }

    nodeClick(node: MenuNode, event: any): void {
        this.headerService.handleNav(node, event);
        this.optimisticSelectedSubNode = node;
    }

    ngOnChanges(changes: NgChanges<NxHeaderLevelTwoComponent>): void {
        if (changes.subNodes.currentValue) {
            this.optimisticSelectedSubNode = null;
            const menuItemsEl = this.menuItemsRef?.nativeElement;
            if (menuItemsEl) {
                menuItemsEl.scrollLeft = 0;
                this.navArrowState.left = false;
            }
            this.checkNavArrowsVisible();
        }
    }
}
