import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd }                          from '@angular/router';
import { Location }                                       from '@angular/common';
import { filter, map, startWith, takeUntil }              from 'rxjs/operators';
import { timer, Subject }                                 from 'rxjs';
import { UntilDestroy }                                   from '@ngneat/until-destroy';
import { NxMenusService, MenuNode }                       from '../../services/menus.service';
import { IConfig, NxConfigService }                       from '../../services/nx-config';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-left-menu[menuName]',
    templateUrl : 'left-menu.component.html',
    styleUrls   : ['left-menu.component.scss']
})
export class NxLeftMenuComponent implements OnInit {
    @Input() menuName: string;
    @Input() baseRoute: string;
    @Input() ignoreQuery = false;
    @Output() onClick = new EventEmitter();
    @Output() handlePrefetch = new EventEmitter<number>();
    @Output() relatedLinks = new EventEmitter<MenuNodeWithParent[]>()

    CONFIG: IConfig;
    menuNodes: MenuNodeWithParent[] = [];
    activeRouteNodes: string[] = [];
    openNodes: string[] = [];
    mouseLeave$ = new Subject();
    prefetchedDocuments = [];

    routeSubscription;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menusService: NxMenusService,
        public location: Location
    ) {
        this.CONFIG = configService.config;
        this.mouseLeave$.subscribe(assetId => {
            console.info(
                `%cSkipped prefetching document ${assetId}`,
                'color:white;font-size:1.5rem;padding: .75rem 4rem;background-color:navy'
            );
        });
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
                    this.relatedLinks.emit(node.parentNode?.nodes || []);
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

    prefetchAsset(assetId) {
        if (assetId) {
            if (this.prefetchedDocuments.includes(assetId)) {
                return console.info(
                    `%cLink already prefetched for ${assetId}`,
                    'color:gray;font-size:1.25rem;padding: .5rem 4rem;background-color:green'
                );
            }
            timer(250).pipe(takeUntil(this.mouseLeave$)).subscribe(() => {
                this.prefetchedDocuments.push(assetId);
                this.handlePrefetch.emit(assetId);
            });
        }
    }

    mapParentNodeAndUrl(currentNode, parentNode?) {
        currentNode.parentNode = parentNode;
        if (!currentNode.url && currentNode.asset_id && this.baseRoute) {
            currentNode.url = this.baseRoute + currentNode.asset_id;
        }
        currentNode.nodes.forEach(childNode => this.mapParentNodeAndUrl(childNode, currentNode));
    }

    handleClick(event) {
        this.onClick.emit(event);
    }

    ngOnInit() {
        this.menusService.getMenu(this.menuName).subscribe(menu => {
            this.menuNodes = menu;
            this.menuNodes.forEach(node => this.mapParentNodeAndUrl(node));
        });
        this.routeSubscription = this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
                startWith(this.location.path())
            )
            .subscribe(url => this.updateActive(this.location.path().split(this.ignoreQuery ? '?' : null)[0]));
    }
};

export type MenuNodeWithParent = MenuNode & {parentNode?: MenuNode};
