import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { cloneDeep } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { GridBreakpoints } from '@styles/theme-variables-common';

import { NxHeaderLevelOneComponent } from './header-level-one/header-level-one.component';
import { NxHeaderLevelTwoComponent } from './header-level-two/header-level-two.component';
import { NxHeaderMobileComponent } from './mobile/mobile.component';

@UntilDestroy()
@Component({
    selector: 'nx-new-header',
    templateUrl: './new-header.component.html',
    styleUrls: ['./new-header.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxHeaderLevelOneComponent,
        NxHeaderLevelTwoComponent,
        NxHeaderMobileComponent,
        NxThemeGeneratorComponent,
    ],
})
export class NxNewHeaderComponent {
    @Input() nodes: MenuNode[];
    @Input() systems: NxSystem[];
    @Input() width: Observable<number>;
    selectedNode: MenuNode;
    displayedNodes: MenuNode[];
    loggedIn$ = this.store.select(accountSelectors.selectIsAuthenticated);
    isMobile$ = new BehaviorSubject<boolean>(false);
    systemCount$: Observable<number>;

    cycleSub = this.headerService.cycleL2Menu$
        .pipe(debounceTime(500), takeUntilDestroyed())
        .subscribe(() => {
            const nodes = this.displayedNodes;
            if (nodes) {
                const nodes = this.displayedNodes;
                this.selectedNode = this.findNodeBasedOnURL(
                    nodes,
                    this.headerService.currentLocation?.path || this.router.url,
                );
            }
        });

    constructor(
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
        private router: Router,
        private scrollMechanicsService: NxScrollMechanicsService,
        systemsService: NxSystemsService,
        private store: Store,
    ) {
        this.menusService.currentSystemNode$
            .pipe(
                filter(node => !!node),
                untilDestroyed(this),
            )
            .subscribe(() => {
                this.showActiveSystem();
            });

        this.headerService.nodes$.pipe(untilDestroyed(this)).subscribe(nodes => {
            this.displayedNodes = nodes;
            this.selectedNode = this.findNodeBasedOnURL(
                nodes,
                this.headerService.currentLocation?.path || this.router.url,
            );
        });

        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                untilDestroyed(this),
            )
            .subscribe(e => {
                this.selectedNode = this.findNodeBasedOnURL(
                    this.displayedNodes,
                    this.headerService.currentLocation?.path,
                );
                this.showActiveSystem();
            });

        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                this.isMobile$.next(width < GridBreakpoints.MD);
            });

        this.systemCount$ = systemsService.systemsSubject.pipe(map(systems => systems.length));
    }

    handleNodeSelect(node: MenuNode): void {
        if (
            this.selectedNode !== node &&
            !(this.selectedNode?.url.includes('/systems') && node.url.includes('/systems'))
        ) {
            this.selectedNode = node;
        }
    }

    showActiveSystem(): void {
        const activeSystemNode = this.menusService.currentSystemNode$.getValue();
        if (
            activeSystemNode &&
            this.router.url.includes('systems/') &&
            (this.selectedNode?.url !== activeSystemNode.url ||
                this.selectedNode.nodes.length !== activeSystemNode.nodes.length)
        ) {
            // specific system page
            this.selectedNode = cloneDeep({ ...activeSystemNode, name: 'systems' });
        }
    }

    navigateToSystemsList(): void {
        this.selectedNode =
            this.headerService.nodes.find(node => node.url === '/systems') || this.selectedNode;
    }

    findNodeBasedOnURL(nodes: MenuNode[], url: string): MenuNode {
        return (
            nodes?.find(node => node?.nodes.find(subNode => subNode.url === url)) ||
            this.selectedNode
        );
    }

    themeGeneratorLayout = 'test';
}
