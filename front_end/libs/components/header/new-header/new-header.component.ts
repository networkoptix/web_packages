import { Component, Input } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { cloneDeep } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { GridBreakpoints } from '@styles/theme-variables-common';

@UntilDestroy()
@Component({
    selector: 'nx-new-header',
    templateUrl: './new-header.component.html',
    styleUrls: ['./new-header.component.scss'],
})
export class NxNewHeaderComponent {
    @Input() nodes: MenuNode[];
    @Input() systems: NxSystem[];
    @Input() loginState: boolean;
    @Input() width: Observable<number>;
    selectedNode: MenuNode;
    displayedNodes: MenuNode[];
    loggedIn: boolean | undefined = undefined;
    isMobile$ = new BehaviorSubject<boolean>(false);
    systemCount$: Observable<number>;

    constructor(
        public headerService: NxHeaderService,
        menusService: NxMenusService,
        router: Router,
        private scrollMechanicsService: NxScrollMechanicsService,
        systemsService: NxSystemsService,
        private store: Store,
    ) {
        if (router.url.includes('/systems/')) {
            menusService.updateActiveSystemMenu(
                this.headerService.activeSystem || this.headerService.lastActive$.value,
            );
        }

        router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                untilDestroyed(this),
            )
            .subscribe((event: NavigationEnd) => {
                if (event.url === '/') {
                    this.selectedNode = this.findNodeBasedOnURL(
                        this.displayedNodes,
                        '/content/about',
                    );
                    return;
                }
                if (event.url.includes('/systems/')) {
                    menusService.updateActiveSystemMenu(
                        this.headerService.activeSystem || this.headerService.lastActive$.value,
                    );
                }
                this.headerService.setLocation(event.url);
                this.selectedNode = this.findNodeBasedOnURL(
                    this.displayedNodes,
                    this.headerService.currentLocation?.path,
                );
            });

        menusService.currentSystemNode$
            .pipe(
                filter(node => !!node),
                untilDestroyed(this),
            )
            .subscribe(node => {
                if (headerService.currentLocation?.path?.includes('/systems/')) {
                    // specific system page
                    this.selectedNode = cloneDeep({ ...node, name: 'systems' });
                }
            });

        this.store
            .select(accountSelectors.selectCurrentUser)
            .pipe(untilDestroyed(this))
            .subscribe(account => {
                if (account?.is_authenticated) {
                    this.loggedIn = true;
                } else {
                    this.loggedIn = false;
                }
            });

        this.headerService.nodes$.pipe(untilDestroyed(this)).subscribe(nodes => {
            this.displayedNodes = nodes;
            this.selectedNode = this.findNodeBasedOnURL(
                nodes,
                this.headerService.currentLocation?.path || router.url,
            );
        });

        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                this.isMobile$.next(width < GridBreakpoints.MD);
            });

        if (router.url === '/') {
            this.selectedNode = this.findNodeBasedOnURL(this.displayedNodes, 'content/about');
        }

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
}
