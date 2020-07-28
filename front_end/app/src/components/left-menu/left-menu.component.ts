
import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxMenusService } from '../../services/menus.service';
import { MenuNode } from '../dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { IConfig, NxConfigService } from '../../services/nx-config';
import { Location } from '@angular/common';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-left-menu[menuName]',
    templateUrl : 'left-menu.component.html',
    styleUrls   : ['left-menu.component.scss']
})
export class NxLeftMenuComponent implements OnInit {
    @Input() menuName: string;

    CONFIG: IConfig;
    menuNodes: MenuNodeWithParent[] = [];
    activeRouteNodes: string[] = [];
    openNodes: string[] = [];

    routeSubscription;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menusService: NxMenusService,
        public location: Location
    ) {
        this.CONFIG = configService.config;
    }

    updateActive = (url: string) => {
        this.activeRouteNodes = [];
        const updateActiveRoutes = (node: MenuNodeWithParent) => {
            const name = node.display_name || node.name;
            const openNodeIndex = this.openNodes.indexOf(name);
            if (openNodeIndex !== 1) {
                this.openNodes.splice(openNodeIndex);
            }
            this.activeRouteNodes.push(name);
            if (node.parentNode) {
                updateActiveRoutes(node.parentNode);
            }
        };
        const findActiveNode = (nodes: MenuNodeWithParent[]) => {
            const checkNode = (node: MenuNodeWithParent) => {
                if (node.url === url) {
                    updateActiveRoutes(node);
                } else if (node.nodes?.length) {
                    findActiveNode(node.nodes);
                }
            };
            nodes.forEach(checkNode);
        };
        findActiveNode(this.menuNodes);
    }

    toggleOpen(node: MenuNode) {
        const name = node.display_name || node.name;
        const nodeIndex = this.openNodes.indexOf(name);
        if (nodeIndex === -1) {
            this.openNodes.push(name);
        } else {
            this.openNodes.splice(nodeIndex);
        }
    }

    mapParentNode(currentNode, parentNode?) {
        currentNode.parentNode = parentNode;
        currentNode.nodes.forEach(childNode => this.mapParentNode(childNode, currentNode));
    }

    ngOnInit() {
        this.menusService.getMenu(this.menuName).subscribe(menu => {
            this.menuNodes = menu;
            this.menuNodes.forEach(node => this.mapParentNode(node));
        });
        this.routeSubscription = this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
                startWith(this.location.path())
            )
            .subscribe(url => this.updateActive(this.location.path()));
    }
};

export type MenuNodeWithParent = MenuNode & {parentNode?: MenuNode};
