import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { icons, images } from '@lib/variables/static-variables';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
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
    logoState = logoAreaState.LOGO;
    menuItemsWidth: number;
    navArrowState = {
        visible: false,
        left: false,
        right: true
    };
    sizeConstants = {
        logoAreaWidth: 256,
        margins: 25
    };
    icons = icons;
    images = images;
    mainActionWidth = 0;
    optimisticSelectedSubNode: MenuNode; // The selected node is typically controlled by the headerServices currentLocation,
    // but this property is used to make the UI smooth when navigating between nodes while the currentLocation is changing

    constructor(
                public headerService: NxHeaderService,
                private menusService: NxMenusService,
                private scrollMechanics: NxScrollMechanicsService) {
        this.scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(size => {
            this.recalculateSizes(size.width);
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

    recalculateSizes(windowWidth = this.scrollMechanics.windowSizeSubject.value.width): void {
        const { logoAreaWidth, margins } = this.sizeConstants;
        this.menuItemsWidth = windowWidth - logoAreaWidth - this.mainActionWidth - margins;
        this.checkNavArrowsVisible(true);
    }

    onActionWidthChange(width: number): void {
        this.mainActionWidth = width;
        this.recalculateSizes();
    }

    ngAfterViewInit(): void {
        this.checkNavArrowsVisible();
    }

    nodeClick(node: MenuNode, event: MouseEvent): void {
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
