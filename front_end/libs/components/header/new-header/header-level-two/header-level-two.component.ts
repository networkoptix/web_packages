import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    signal,
    ViewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { filter } from 'rxjs';

import { NxMainActionComponent } from '@components/header/new-header/header-level-two/main-action/main-action.component';
import { NxHeaderLogoAreaComponent } from '@components/header/new-header/logo-area/logo-area.component';
import { NxApplyService } from '@services/apply.service';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { icons, images } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { logoAreaState, logoClickType } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-level-two',
    templateUrl: './header-level-two.component.html',
    styleUrls: ['./header-level-two.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxHeaderLogoAreaComponent,
        NxMainActionComponent,
    ],
})
export class NxHeaderLevelTwoComponent {
    @ViewChild('menuItems', { static: true }) menuItemsRef: ElementRef<HTMLElement>;
    @ViewChild('contextButton') contextButtonRef: ElementRef<HTMLElement>;
    @Input() subNodes: MenuNode[];
    @Input() systemCount: number;
    @Output() systemNav = new EventEmitter<boolean>();
    logoState = logoAreaState.LOGO;
    menuItemsWidth$$ = signal(0);
    navArrowState = {
        visible: false,
        left: false,
        right: true,
    };
    sizeConstants = {
        logoAreaWidth: 256,
        margins: 25,
    };
    icons = icons;
    images = images;
    mainActionWidth = 0;
    optimisticSelectedSubNode: MenuNode | undefined; // The selected node is typically controlled by the headerServices currentLocation,
    // but this property is used to make the UI smooth when navigating between nodes while the currentLocation is changing

    constructor(
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
        private scrollMechanics: NxScrollMechanicsService,
        private router: Router,
        nxApplyService: NxApplyService,
    ) {
        this.scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(size => {
            this.recalculateSizes(size.width);
        });

        nxApplyService.popupActive$
            .pipe(
                untilDestroyed(this),
                filter(value => !!value),
            )
            .subscribe(() => {
                this.optimisticSelectedSubNode = undefined;
            });

        this.router.events.pipe(untilDestroyed(this)).subscribe(event => {
            if (event instanceof NavigationEnd) {
                if (event.url !== this.optimisticSelectedSubNode?.url) {
                    this.optimisticSelectedSubNode = undefined;
                }
            }
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
        const changedScroll = direction === 'right' ? scrollDistance : -1 * scrollDistance;
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
                this.navArrowState.right =
                    menuItemsEl.scrollLeft !== menuItemsEl.scrollWidth - menuItemsEl.clientWidth;
                if (checkLeft) {
                    this.navArrowState.left = menuItemsEl.scrollLeft !== 0;
                }
            }
        }, 0);
    }

    recalculateSizes(windowWidth = window.innerWidth): void {
        const { logoAreaWidth, margins } = this.sizeConstants;
        this.menuItemsWidth$$.set(windowWidth - logoAreaWidth - this.mainActionWidth - margins);
        this.checkNavArrowsVisible(true);
    }

    onActionWidthChange(width: number): void {
        this.mainActionWidth = width;
        this.recalculateSizes();
    }

    ngAfterViewInit(): void {
        this.checkNavArrowsVisible();
    }

    nodeClick(node: MenuNode, event: MouseEvent): false {
        this.headerService.handleNav(node, event);
        if (!node.new_window) {
            this.optimisticSelectedSubNode = node;
        }
        return false;
    }

    ngOnChanges(changes: NgChanges<NxHeaderLevelTwoComponent>): void {
        if (changes.subNodes?.currentValue) {
            this.optimisticSelectedSubNode = undefined;
            const menuItemsEl = this.menuItemsRef?.nativeElement;
            if (menuItemsEl) {
                menuItemsEl.scrollLeft = 0;
                this.navArrowState.left = false;
            }
            this.checkNavArrowsVisible();
        }
    }
}
