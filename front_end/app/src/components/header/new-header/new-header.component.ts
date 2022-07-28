import { Component, Input, OnChanges } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystem } from '@services/system.service/system';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy()
@Component({
    selector: 'nx-new-header',
    templateUrl: './new-header.component.html',
    styleUrls: ['./new-header.component.scss']
})
export class NxNewHeaderComponent implements OnChanges {
    @Input() nodes: MenuNode[];
    @Input() systems: NxSystem[];
    @Input() loginState: boolean;
    @Input() width: Observable<number>;
    selectedNode: MenuNode;
    displayedNodes: MenuNode[];
    loggedIn = false;
    isMobile$: Observable<boolean>;

    constructor(public headerService: NxHeaderService, menusService: NxMenusService, accountService: NxAccountService, router: Router) {
        router.events.pipe(filter(event => event instanceof NavigationEnd), untilDestroyed(this)).subscribe((event: NavigationEnd) => {
            if (event.url === '/') {
                this.selectedNode = this.findNodeBasedOnURL(this.displayedNodes, 'content/about');
                return;
            }
            if (event.url.includes('/systems/') && !menusService.currentSystemNode$.value) {
                menusService.updateActiveSystemMenu(this.headerService.activeSystem || this.headerService.lastActive$.value);
            }
            this.headerService.setLocation(event.url);
            this.selectedNode = this.findNodeBasedOnURL(this.displayedNodes, this.headerService.currentLocation?.path);
        });

        menusService.currentSystemNode$.pipe(filter(node => !!node), untilDestroyed(this)).subscribe(node => {
            if (headerService.currentLocation?.path?.includes('/systems/')) { // specific system page
                this.selectedNode = cloneDeep({ ...node, name: 'systems' });
            }
        });

        accountService.accountSubject
            .subscribe(account => {
                if (account) {
                    this.loggedIn = true;
                } else {
                    this.loggedIn = false;
                }
            });
    }

    handleNodeSelect(node: MenuNode): void {
        if (this.selectedNode !== node) {
            this.selectedNode = node;
        }
    }

    navigateToSystemsList(): void {
        this.selectedNode = this.nodes.find(node => node.url === '/systems') || this.selectedNode;
    }

    findNodeBasedOnURL(nodes: MenuNode[], url: string): MenuNode {
        return nodes?.find(node => node?.nodes.find(subNode => subNode.url === url)) || this.selectedNode;
    }

    ngOnChanges(changes: NgChanges<NxNewHeaderComponent>): void {
        if (changes.nodes?.currentValue?.length) {
            this.displayedNodes = changes.nodes.currentValue;
            this.selectedNode = this.findNodeBasedOnURL(changes.nodes.currentValue, this.headerService.currentLocation?.path);
        }

        if (changes.width?.currentValue) {
            this.isMobile$ = changes.width.currentValue.pipe(
                map(width => width < 576)
            );
        }
    }
}
