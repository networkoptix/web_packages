import { Component, Output, EventEmitter, Inject, OnInit }  from '@angular/core';
import { Location }                                         from '@angular/common';
import { takeUntil }                                        from 'rxjs/operators';
import { timer, Subject }                                   from 'rxjs';
import { UntilDestroy, untilDestroyed }                     from '@ngneat/until-destroy';

import { WINDOW }                                   from '@services/window-provider';
import { MenuNode }                                 from '@services/menus.service';
import { IConfig, NxConfigService }                 from '@services/nx-config';
import { NxKnowledgebaseService }                   from '@pages/developers/knowledge-base/knowledge-base.service';

export interface RelatedLinks {
    type: string,
    nodes: MenuNodeWithParent[]
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-left-menu',
    templateUrl: 'left-menu.component.html',
    styleUrls: ['left-menu.component.scss']
})
export class NxLeftMenuComponent implements OnInit {
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
    highlightedTopNode: string;
    ignoreQuery = true;

    constructor(
        configService: NxConfigService,
        public location: Location,
        public kbService: NxKnowledgebaseService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
    }

    updateActive = (activeAssetId, activeAssetState) => {
        this.activeRouteNodes = [];
        const updateActiveRoutes = (node: MenuNodeWithParent, updateUrl = false) => {
            if (updateUrl) {
                const currentQueryParams = this.window.location.search;
                const currentPath = this.location.path();
                // Change URL in address bar to have the current one if a different one was used
                if (node.url !== currentPath) {
                    let newUrl = node.url;
                    if (currentQueryParams) {
                        newUrl += currentQueryParams;
                    } else if (node.state) {
                        newUrl += `?state=${node.state}`;
                    }
                    this.location.replaceState(newUrl);
                }

                this.kbService.activeNode = node;
                // If activeNode is set we don't want firstUrl to be highlighted anymore
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
        const findActiveNode = (nodes: MenuNodeWithParent[], targetAssetId, targetState, action: string = 'update') => {
            const checkNode = (node: MenuNodeWithParent) => {
                if (node.asset_id === targetAssetId && (!node.state && !this.kbService.activeAssetState || node.state === this.kbService.activeAssetState)) {
                    if (action === 'update') {
                        updateActiveRoutes(node, true);
                        if (node.next_item) {
                            this.relatedLinks.emit({ type: 'next', nodes: nodes.filter(node => !node.indented) });
                        } else {
                            node.related_asset_ids.forEach(id => {
                                findActiveNode(this.menuNodes, id, targetState, 'findRelated');
                            });
                            this.relatedLinks.emit({ type: 'related', nodes: relatedNodes.filter(node => !node.indented) });
                        }
                    } else if (action === 'findRelated' && !relatedNodes.some(relNode => relNode.url === node.url || relNode.asset_id === targetAssetId)) {
                        relatedNodes.push(node);
                    }
                } else if (node.nodes?.length) {
                    findActiveNode(node.nodes, targetAssetId, targetState, action);
                }
            };
            nodes.forEach(checkNode);
        };

        findActiveNode(this.menuNodes, activeAssetId, activeAssetState);
        this.highlightedTopNode = this.activeRouteNodes.filter(name => !this.openNodes.includes(name)).reverse()[0];
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
        const nodeIndex = this.openNodes.indexOf(name);
        if (nodeIndex === -1) {
            this.openNodes.push(name);
        } else {
            this.openNodes = this.openNodes.filter(filterTree(name));
        }
        this.highlightedTopNode = this.activeRouteNodes.filter(name => !this.openNodes.includes(name)).reverse()[0];
    }

    prefetchAsset(assetId, state) {
        if (assetId) {
            timer(250).pipe(takeUntil(this.mouseLeave$), untilDestroyed(this)).subscribe(() => {
                this.prefetchedDocuments.push(state ? `${assetId}?state=${state}` : assetId);
                this.handlePrefetch.emit({ assetId, state });
            });
        }
    }

    handleClick(event) {
        this.onClick.emit(event);
    }

    ngOnInit() {
        this.kbService.menuSubject.pipe(
            untilDestroyed(this)
        ).subscribe((menu) => {
            if (menu?.nodes) {
                this.menuNodes = menu.nodes;
                // eslint-disable-next-line camelcase
                if (this.kbService.account?.is_superuser) {
                    this.ignoreQuery = false;
                }
            } else {
                this.menuNodes = [];
            }
        });

        this.kbService.activeAssetIdSubject.subscribe(id => {
            this.updateActive(id, this.kbService.activeAssetState);
        });
    }
};

export type MenuNodeWithParent = MenuNode & {parentNode?: MenuNode};
