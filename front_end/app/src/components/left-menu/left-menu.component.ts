import { Component, Input, Output, EventEmitter, Inject } from '@angular/core';
import { Router, NavigationEnd }                    from '@angular/router';
import { DOCUMENT, Location } from '@angular/common';
import {
    filter, map, startWith, switchMap, takeUntil
}                                                   from 'rxjs/operators';
import { timer, Subject }                           from 'rxjs';
import { UntilDestroy, untilDestroyed }             from '@ngneat/until-destroy';
import { NxMenusService, MenuNode }                 from '../../services/menus.service';
import { IConfig, NxConfigService }                 from '../../services/nx-config';
import { NxAccountService }                         from '@services/account.service';
import { MenuStructure } from '@services/nx-config/base-config';

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
    @Input() showDefault = true;
    @Input() allowEmpty = false;
    @Output() onClick = new EventEmitter();
    @Output() handlePrefetch = new EventEmitter<{assetId: number, state?: 'pending' | 'draft'}>();
    @Output() relatedLinks = new EventEmitter<RelatedLinks>()

    CONFIG: IConfig;
    menuNodes: MenuNodeWithParent[] = [];
    activeRouteNodes: string[] = [];
    openNodes: string[] = [];
    mouseLeave$ = new Subject();
    prefetchedDocuments = [];
    firstUrl = '';
    activeNodeUrl = '';
    ignoreQuery = true;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menusService: NxMenusService,
        public location: Location,
        private accountService: NxAccountService,
        @Inject(DOCUMENT) private document: any
    ) {
        this.CONFIG = configService.config;
    }

    updateActive = (url: string) => {
        this.activeRouteNodes = [];
        const updateActiveRoutes = (node: MenuNodeWithParent, updateUrl = false) => {
            if (updateUrl) {
                const currentQueryParams = this.document.location.search;
                const currentPath = this.location.path();
                // Change URL in address bar to have the current one if a different one was used
                if (node.url !== currentPath) {
                    let newUrl = node.url;
                    if (currentQueryParams) {
                        newUrl += currentQueryParams;
                    }
                    this.location.replaceState(newUrl);
                }

                this.activeNodeUrl = node.url;
                // If activeNodeUrl is set we don't want firstUrl to be highlighted anymore
                this.firstUrl = '';
            }
            const name = node.display_name || node.name;
            this.activeRouteNodes.push(name);
            this.openNodes.push(name);
            if (node.parentNode) {
                updateActiveRoutes(node.parentNode);
            }
        };
        const relatedNodes = [];
        const findActiveNode = (nodes: MenuNodeWithParent[], targetAssetId, targetUrl = decodeURIComponent(url), action: string = 'update') => {
            const checkNode = (node: MenuNodeWithParent) => {
                if (node.url === targetUrl || node.asset_id === targetAssetId) {
                    if (action === 'update') {
                        updateActiveRoutes(node, true);
                        if (node.next_item) {
                            this.relatedLinks.emit({ type: 'next', nodes: nodes.filter(node => !node.indented) });
                        } else {
                            node.related_asset_ids.forEach(id => {
                                findActiveNode(this.menuNodes, id, this.baseRoute + id, 'findRelated');
                            });
                            this.relatedLinks.emit({ type: 'related', nodes: relatedNodes.filter(node => !node.indented) });
                        }
                    } else if (action === 'findRelated' && !relatedNodes.some(relNode => relNode.url === node.url || relNode.asset_id === targetAssetId)) {
                        relatedNodes.push(node);
                    }
                } else if (node.nodes?.length) {
                    findActiveNode(node.nodes, targetAssetId, targetUrl, action);
                }
            };
            nodes.forEach(checkNode);
        };
        const urlPieces = url.split('/');
        const assetId = urlPieces[urlPieces.length - 1].split('-')[0];
        let targetAssetId = parseInt(assetId);
        if (isNaN(targetAssetId)) {
            targetAssetId = -1;
        }
        findActiveNode(this.menuNodes, targetAssetId);
        if (this.showDefault && !this.activeRouteNodes.length && this.menuNodes.length) {
            const getFirstUrl = ([first, ...remaining]: MenuNode[] = []): string => first.url || getFirstUrl([...remaining, ...first.nodes]);
            this.firstUrl = getFirstUrl(this.menuNodes);
            this.updateActive(this.firstUrl);
        }
    }

    toggleOpen(node: MenuNode) {
        const getRootNode = (name, nodesToCheck = this.menuNodes, rootNode: MenuNodeWithParent[] = []) => {
            const checkNode = (currentNode: MenuNodeWithParent) => {
                const currentNodeName = currentNode.display_name || currentNode.name;
                if (currentNodeName === name) {
                    rootNode.push(currentNode);
                } else {
                    return getRootNode(name, currentNode.nodes, rootNode);
                }
            };
            if (rootNode.length || !nodesToCheck) {
                return;
            }

            nodesToCheck.forEach(checkNode);
            return rootNode;
        };
        const getChildNodes = (nodeNames: string[], current: MenuNodeWithParent) => {
            const pushCurrent = (current: MenuNodeWithParent) => {
                const currentNodeName = current.display_name || current.name;
                nodeNames.push(currentNodeName);
                current.nodes.forEach(pushCurrent);
            };
            pushCurrent(current);
            return nodeNames;
        };
        const nodesFromRoot = (rootNodeName) => getRootNode(rootNodeName).reduce(getChildNodes, []);
        const filterTree = (rootNodeName) => nodeToCheck => !nodesFromRoot(rootNodeName).includes(nodeToCheck);
        const name = node.display_name || node.name;
        if (this.activeRouteNodes.includes(name)) {
            return;
        }
        const nodeIndex = this.openNodes.indexOf(name);
        if (nodeIndex === -1) {
            this.openNodes.push(name);
        } else {
            this.openNodes = this.openNodes.filter(filterTree(name));
        }
    }

    prefetchAsset(assetId, state) {
        if (assetId) {
            timer(250).pipe(takeUntil(this.mouseLeave$), untilDestroyed(this)).subscribe(() => {
                this.prefetchedDocuments.push(state ? `${assetId}?state=${state}` : assetId);
                this.handlePrefetch.emit({ assetId, state });
            });
        }
    }

    mapParentNodeAndUrl(currentNode, parentNode?) {
        currentNode.parentNode = parentNode;
        if (!currentNode.url && currentNode.asset_id && this.baseRoute) {
            currentNode.url = this.baseRoute + (currentNode.urlified || currentNode.asset_id);
        }
        currentNode.nodes.forEach(childNode => this.mapParentNodeAndUrl(childNode, currentNode));
    }

    handleClick(event) {
        this.onClick.emit(event);
    }

    ngOnChanges() {
        this.accountService.accountSubject.pipe(
            switchMap((account: any) => this.menusService.getMenu(
                // eslint-disable-next-line camelcase
                this.menuName, false, account?.is_superuser
            ).pipe(
                map((menu): [MenuNode[], any] => [menu.nodes, account])
            )),
            untilDestroyed(this)
        ).subscribe(([menu, account]) => {
            this.menuNodes = this.allowEmpty ? menu : this.menusService.cleanEmptyNodes(menu, true);
            this.menuNodes.forEach(node => this.mapParentNodeAndUrl(node));
            // eslint-disable-next-line camelcase
            if (account?.is_superuser) {
                this.menuNodes = this.menusService.addDraftAndPending(this.menuNodes);
                this.ignoreQuery = false;
                this.updateActive(this.location.path());
            }
        });
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
                startWith(this.location.path()),
                untilDestroyed(this)
            )
            .subscribe(url => Promise.resolve(url).then(url => this.updateActive(url.split(this.ignoreQuery ? '?' : null)[0])));
    }
};

export type MenuNodeWithParent = MenuNode & {parentNode?: MenuNode};
