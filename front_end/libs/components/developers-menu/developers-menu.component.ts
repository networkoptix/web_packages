import { CommonModule, Location } from '@angular/common';
import { Component, Output, EventEmitter, Inject, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueryParamsHandling, RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, last } from 'lodash-es';
import { timer, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxSearchComponent } from '@components/search/search.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';
import { MenuNode } from '@services/menus.service.types';
import { nxConfig } from '@services/nx-config/config';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';
import { highlight } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { MenuNodeWithParent, ClickEvent, RelatedLinks } from './developers-menu-types';

@UntilDestroy()
@Component({
    selector: 'nx-developers-menu',
    templateUrl: 'developers-menu.component.html',
    styleUrls: ['developers-menu.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        PipesModule,
        RouterModule,
        AngularSvgIconModule,
        NxPreLoaderComponent,
        NxSearchComponent,
        NxAddSvgSrcDirective,
    ],
    standalone: true,
})
export class NxDevelopersMenuComponent implements OnInit {
    @Output() onClick = new EventEmitter<ClickEvent>();
    @Output() handlePrefetch = new EventEmitter<{
        assetId: number;
        state?: 'pending' | 'draft';
        version?: number;
    }>();
    // eslint-disable-next-line lines-between-class-members
    @Output() relatedLinks = new EventEmitter<RelatedLinks>();
    @Output() searchQueryEmitter = new EventEmitter<string>();
    @Input() queryParamsOnInternalRoute: QueryParamsHandling = undefined;
    @Input() searchEnabled = true;
    @Input() service;
    @Input() offsetHeight = 0;
    @Input() additionalSearchNodes: MenuNodeWithParent[] = [];

    displayedMenuNodes: MenuNodeWithParent[] = [];
    menuNodes: MenuNodeWithParent[] = [];
    activeRouteNodes: string[] = [];
    openNodes: string[] = [];
    mouseLeave$ = new Subject();
    firstUrl = '';
    highlightedTopNode: string;
    searchQuery$ = new BehaviorSubject('');
    icons = icons;

    constructor(
        public location: Location,
        public ribbonService: NxRibbonService,
        private uriService: NxUriService,
        @Inject(WINDOW) private window: Window,
    ) {}

    updateActive = (activeAssetId, activeAssetState): void => {
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

                this.service.activeNode = node;
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
        const findActiveNode = (
            nodes: MenuNodeWithParent[],
            targetAssetId,
            targetState,
            action: string = 'update',
        ) => {
            const checkNode = (node: MenuNodeWithParent) => {
                if (
                    node.asset_id === targetAssetId &&
                    ((!node.state && !activeAssetState) || node.state === activeAssetState)
                ) {
                    if (action === 'update') {
                        updateActiveRoutes(node, true);
                        if (node.next_item) {
                            this.relatedLinks.emit({
                                type: 'next',
                                nodes: nodes.filter(node => !node.indented),
                            });
                        } else {
                            node.related_asset_ids.forEach(id => {
                                findActiveNode(this.menuNodes, id, targetState, 'findRelated');
                            });
                            this.relatedLinks.emit({
                                type: 'related',
                                nodes: relatedNodes.filter(node => !node.indented),
                            });
                        }
                    } else if (
                        action === 'findRelated' &&
                        !relatedNodes.some(
                            relNode =>
                                relNode.url === node.url || relNode.asset_id === targetAssetId,
                        )
                    ) {
                        relatedNodes.push(node);
                    }
                } else if (node.nodes?.length) {
                    findActiveNode(node.nodes, targetAssetId, targetState, action);
                }
            };
            nodes.forEach(checkNode);
        };

        findActiveNode(this.menuNodes, activeAssetId, activeAssetState);
        this.highlightedTopNode = last(
            this.activeRouteNodes.filter(name => !this.openNodes.includes(name)),
        );
    };

    toggleOpen(node: MenuNode) {
        const getRootNode = (
            name,
            nodesToCheck = this.displayedMenuNodes,
            rootNode: MenuNodeWithParent[] = [],
        ) => {
            const checkNode = (currentNode: MenuNodeWithParent) => {
                const currentNodeName = currentNode.name || currentNode.display_name;
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
                const currentNodeName = current.name || current.display_name;
                nodeNames.push(currentNodeName);
                current.nodes.forEach(pushCurrent);
            };
            pushCurrent(current);
            return nodeNames;
        };
        const nodesFromRoot = rootNodeName => getRootNode(rootNodeName).reduce(getChildNodes, []);
        const filterTree = rootNodeName => nodeToCheck =>
            !nodesFromRoot(rootNodeName).includes(nodeToCheck);
        const name = node.name || node.display_name;
        if (!this.openNodes.includes(name)) {
            this.openNodes.push(name);
        } else {
            this.openNodes = this.openNodes.filter(filterTree(name));
        }
        this.highlightedTopNode = last(
            this.activeRouteNodes.filter(name => !this.openNodes.includes(name)),
        );
    }

    prefetchAsset(assetId, state, version): void {
        if (assetId) {
            timer(nxConfig.featureFlags.kbInstantSearch ? 50 : 250)
                .pipe(untilDestroyed(this), takeUntil(this.mouseLeave$))
                .subscribe(() => {
                    this.handlePrefetch.emit({ assetId, state, version });
                });
        }
    }

    handleClick(node: MenuNodeWithParent, clearSearch = false, toggleOpen = true): void {
        if (toggleOpen) {
            this.toggleOpen(node);
        }
        this.onClick.emit({ node, clearSearch });
    }

    openNodeAndParents = (node: MenuNodeWithParent): void => {
        this.openNodes.push(node.name || node.display_name);
        let loopProtector = 0;
        while (node.parentNode && loopProtector < 10) {
            node = node.parentNode;
            this.openNodes.push(node.name || node.display_name);
            loopProtector++; // Just in case the nodes have an invalid structure for whatever reason
        }
    };

    updateSearchQuery({ query }): void {
        if (query === undefined || (query !== '' && query === this.searchQuery$.value)) {
            return;
        }
        this.searchQuery$.next(query);
    }

    filterMenuItems(query: string) {
        const newDisplayedNodes: MenuNodeWithParent[] = [];
        const newOpenNodes: string[] = [];
        const highlightText = (node: MenuNodeWithParent, startInd: number) => {
            return highlight(node.display_name || node.name, startInd, startInd + query.length);
        };
        const isSeperator = (node: MenuNodeWithParent) => {
            if (!node) {
                return false;
            }
            return node.name.includes('-seperator');
        };
        const search = (menuNode: MenuNodeWithParent) => {
            if (!menuNode) {
                return false;
            }
            let inQuery = false;
            const name = menuNode.display_name.toLowerCase();
            const startInd = name.indexOf(query.toLowerCase());
            const pathMatchesQuery = menuNode.name.toLowerCase().includes(query.toLowerCase()); // For API-Tool: display_name is not always the path, need to check if the path matches the query
            const isSeperator = menuNode.name.includes('-seperator');
            const displayedNode = cloneDeep(menuNode);
            displayedNode.nodes = [];
            let newName = displayedNode.display_name || displayedNode.name;
            if (startInd !== -1) {
                if (menuNode && !menuNode.name.includes('seperator')) {
                    newName = highlightText(menuNode, startInd);
                }
                inQuery = true;
            }
            if (
                pathMatchesQuery ||
                isSeperator ||
                this.additionalSearchNodes.find(node => node.name === menuNode.name)
            ) {
                inQuery = true;
            }
            for (const node of menuNode.nodes) {
                const childNode = search(node);
                if (childNode) {
                    inQuery = true;
                    displayedNode.nodes.push(childNode);
                }
            }
            if (inQuery) {
                displayedNode.display_name = newName;
                newOpenNodes.push(displayedNode.name);
                return displayedNode;
            }
            return false;
        };
        for (const node of this.menuNodes) {
            const queriedNode = search(node);
            if (queriedNode) {
                newDisplayedNodes.push(queriedNode);
            }
        }
        for (let i = 0; i < newDisplayedNodes.length - 1; i++) {
            if (isSeperator(newDisplayedNodes[i]) && isSeperator(newDisplayedNodes[i + 1])) {
                newDisplayedNodes.splice(i, i);
            }
        }
        while (isSeperator(newDisplayedNodes[newDisplayedNodes.length - 1])) {
            newDisplayedNodes.pop();
        }
        if (isSeperator(newDisplayedNodes[0]) && isSeperator(newDisplayedNodes[1])) {
            newDisplayedNodes.shift();
        }
        this.openNodes = newOpenNodes;
        this.displayedMenuNodes = newDisplayedNodes;
    }

    ngOnInit(): void {
        this.service.menuSubject?.pipe(untilDestroyed(this)).subscribe(menu => {
            if (menu?.nodes?.length) {
                if (!this.additionalSearchNodes.length) {
                    this.displayedMenuNodes = menu.nodes;
                    this.menuNodes = menu.nodes;
                    if (this.searchEnabled && this.uriService.queryParams.search) {
                        this.searchQuery$.next(this.uriService.queryParams.search);
                    }
                    if (this.service.activeNode) {
                        this.openNodeAndParents(this.service.activeNode);
                    }
                }
                if (this.additionalSearchNodes.length) {
                    this.filterMenuItems(this.searchQuery$.value);
                }
            } else {
                this.displayedMenuNodes = [];
                this.menuNodes = this.displayedMenuNodes;
            }
        });

        this.service.activeAssetIdSubject?.pipe(untilDestroyed(this)).subscribe(id => {
            this.updateActive(id, this.service.activeAssetState);
        });

        this.searchQuery$.pipe(untilDestroyed(this)).subscribe(query => {
            this.additionalSearchNodes = [];
            this.searchQueryEmitter.emit(query);
            if (query !== '') {
                this.filterMenuItems(query);
            } else {
                this.displayedMenuNodes = this.menuNodes;
                this.openNodes = [];
                if (this.service.activeNode) {
                    this.openNodeAndParents(this.service.activeNode);
                }
            }
        });
    }

    ngOnChanges(changes: NgChanges<NxDevelopersMenuComponent>): void {
        if (changes.additionalSearchNodes?.currentValue) {
            this.filterMenuItems(this.searchQuery$.value);
        }
    }
}
