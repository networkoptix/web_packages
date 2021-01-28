import { Component, Input, Output, EventEmitter }   from '@angular/core';
import { Router, NavigationEnd }                    from '@angular/router';
import { Location }                                 from '@angular/common';
import { filter, map, startWith, takeUntil }        from 'rxjs/operators';
import { timer, Subject }                           from 'rxjs';
import { UntilDestroy, untilDestroyed }             from '@ngneat/until-destroy';
import { NxMenusService, MenuNode }                 from '../../services/menus.service';
import { IConfig, NxConfigService }                 from '../../services/nx-config';

export interface RelatedLinks {
    type: string,
    nodes: MenuNodeWithParent[]
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-left-menu[menuName]',
    templateUrl : 'left-menu.component.html',
    styleUrls   : ['left-menu.component.scss']
})
export class NxLeftMenuComponent {
    @Input() menuName: string;
    @Input() baseRoute: string;
    @Input() ignoreQuery = false;
    @Input() showDefault = true;
    @Input() allowEmpty =false;
    @Output() onClick = new EventEmitter();
    @Output() handlePrefetch = new EventEmitter<number>();
    @Output() relatedLinks = new EventEmitter<RelatedLinks>()

    CONFIG: IConfig;
    menuNodes: MenuNodeWithParent[] = [];
    activeRouteNodes: string[] = [];
    openNodes: string[] = [];
    mouseLeave$ = new Subject();
    prefetchedDocuments = [];
    firstUrl = ''

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
        const relatedNodes = [];
        const findActiveNode = (nodes: MenuNodeWithParent[], targetUrl = url, action:string = 'update') => {
            const checkNode = (node: MenuNodeWithParent) => {
                if (node.url === targetUrl) {
                    if (action === 'update') {
                        updateActiveRoutes(node);
                        if (node.next_item) {
                            this.relatedLinks.emit({ type: 'next', nodes: node.parentNode?.nodes || [] });
                        } else {
                            node.related_asset_ids.forEach(id => {
                                findActiveNode(this.menuNodes, this.baseRoute + id, 'findRelated');
                            });
                            this.relatedLinks.emit({ type: 'related', nodes: relatedNodes });
                        }
                    } else if (action === 'findRelated' && !relatedNodes.some(relNode => relNode.url === node.url)) {
                        relatedNodes.push(node);
                    }
                } else if (node.nodes?.length) {
                    findActiveNode(node.nodes, targetUrl, action);
                }
            };
            nodes.forEach(checkNode);
        };
        findActiveNode(this.menuNodes);
        if (this.showDefault && !this.activeRouteNodes.length) {
            const getFirstUrl = ([first, ...remaining]: MenuNode[] = []): string => first.url || getFirstUrl([...remaining, ...first.nodes]);
            this.firstUrl = getFirstUrl(this.menuNodes);
            this.updateActive(this.firstUrl);
        }
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
            timer(250).pipe(takeUntil(this.mouseLeave$), untilDestroyed(this)).subscribe(() => {
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

    ngOnChanges() {
        this.menusService.getMenu(this.menuName).pipe(untilDestroyed(this)).subscribe(menu => {
            this.menuNodes = this.allowEmpty ? menu : this.menusService.cleanEmptyNodes(menu, true);
            this.menuNodes.forEach(node => this.mapParentNodeAndUrl(node));
        });
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
                startWith(this.location.path()),
                untilDestroyed(this)
            )
            .subscribe(url => this.updateActive(this.location.path().split(this.ignoreQuery ? '?' : null)[0]));
    }
};

export type MenuNodeWithParent = MenuNode & {parentNode?: MenuNode};
