/* eslint-disable camelcase */
import {
    Component,
    OnInit,
    Renderer2,
    ViewChild,
    ElementRef,
    Inject,
    OnDestroy
} from '@angular/core';
import {
    ActivatedRoute,
    ActivatedRouteSnapshot,
    NavigationEnd,
    Router
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { BehaviorSubject, combineLatest, from, Observable, of } from 'rxjs';
import {
    switchMap,
    tap,
    map,
    filter,
    startWith,
    catchError
} from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type {
    ClickEvent,
    MenuNodeWithParent,
    RelatedLinks
} from '@components/developers-menu/developers-menu-types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import type { RibbonActionInput } from '@components/ribbon/ribbon.types';
import type { SearchFilter } from '@components/search/search.component.types';
import { IntersectionStatus } from '@directives/nx-intersection.directive.types';
import { MenuNode } from '@services/menus.service.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { DOC_TYPES } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { highlight } from '@utils/general';

import { NxKnowledgebaseService } from './knowledge-base.service';

enum CardClasses {
    NORMAL = 'text',
    CONTENT = 'content',
    SIDE = 'side',
    ARTICLE = 'article'
}

class KnowledgeNode {
    private constructor(
        public title: string,
        public url: string,
        public content: string,
        public nodes: KnowledgeNode[],
        public script: string,
        public cardClass: CardClasses,
        public cardIcon?: string,
        public cardLead?: string
    ) { }

    // Factory methods
    static normalHeader(
        title: string,
        url: string,
        content: string,
        cardClass = CardClasses.NORMAL,
        nodes: KnowledgeNode[] = [],
        script = ''
    ) {
        return new KnowledgeNode(
            title,
            url,
            content,
            nodes,
            script,
            cardClass
        );
    }

    // These additional card type nodes were on some original mockups
    // Can probably be removed if we don't end up using
    // static sideHeader(
    //     title: string,
    //     url: string,
    //     content,
    //     nodes: KnowledgeNode[],
    //     script = '',
    //     cardIcon: string,
    //     cardLead: string
    // ) {
    //     return new KnowledgeNode(
    //         title,
    //         url,
    //         content,
    //         nodes,
    //         script,
    //         CardClasses.SIDE,
    //         cardIcon,
    //         cardLead
    //     );
    // }

    // static article(
    //     title: string,
    //     url: string,
    //     content: string,
    //     showHeader = true,
    //     nodes = [],
    //     script = ''
    // ) {
    //     return new KnowledgeNode(
    //         showHeader ? title : '',
    //         url,
    //         content,
    //         nodes,
    //         script,
    //         CardClasses.ARTICLE,
    //         '',
    //         ''
    //     );
    // }
}

@UntilDestroy({ checkProperties: false })
@Component({
    selector: 'nx-knowledge-base',
    templateUrl: 'knowledge-base.component.html',
    styleUrls: ['knowledge-base.component.scss']
})
export class NxKnowledgeBaseComponent implements OnInit, OnDestroy {
    @ViewChild('scriptDiv', { read: ElementRef }) private scriptDiv: ElementRef;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    currentSearchResultPage = 0;
    totalSearchResultPages = 0;
    totalResults = 0;
    loadingNext = false;
    loading = true;
    searchMode = false;
    searchLoading = false;
    previousQuery = '';
    pageNode: KnowledgeNode;
    search: SearchFilter = { query: '' };
    searchResults$ = new BehaviorSubject([]);
    searchQuery$ = new BehaviorSubject({ query: '' });
    relatedLinks$ = new BehaviorSubject<RelatedLinks>({ type: '', nodes: [] });
    relatedLinksFiltered$: Observable<MenuNodeWithParent[]>;

    CardClasses = CardClasses;

    filterRelatedLinks([assetId, relatedLinks]: [string, RelatedLinks]) {
        if (this.kbService.menuName) {
            if (relatedLinks.type === 'next') {
                const currentIndex = relatedLinks.nodes
                    .findIndex(({ asset_id: id }) => id === assetId);
                if (currentIndex === (relatedLinks.nodes.length - 1)) {
                    return [];
                } else {
                    return [relatedLinks.nodes[currentIndex + 1]];
                }
            } else if (relatedLinks.type === 'related') {
                return relatedLinks.nodes;
            }
        }
        return [];
    }

    updateSearchQuery({ query }): void {
        if (this.searchQuery$.value.query === query) {
            return;
        }

        this.search = { query, ...this.search };
        this.searchQuery$.next({ query: query || '' });
    }

    handleClick = (click: ClickEvent) => {
        if (click.clearSearch) {
            const prefetchLookup = {
                state: click.node?.draft ? 'draft' : click.node?.pending ? 'pending' : null,
                assetId: click.node?.asset_id,
                version: click.node?.version
            };
            const prefetched = this.kbService.prefetchedDocuments.find(doc => isEqual(doc, prefetchLookup));
            const routeChanged = click.node?.url !== this.kbService.activeNode?.url;
            this.loading = routeChanged && !prefetched;
            this.clearSearch();
        }
    };

    clearSearch = () => {
        this.searchLoading = false;
        this.searchResults$.next([]);
        this.searchMode = false;
    };

    navigateSearch(event): void {
        const openNewWindow = event?.metaKey || event?.ctrlKey;
        if (!openNewWindow) {
            this.searchMode = false;
        }
    }

    projectedLinkHandler({ url, target }: { url: string, target: string }) {
        const base = this.window.location.origin;
        if (target || !url.startsWith(base)) {
            return this.window.open(url, target || '_self');
        }
        const updated = url.replace(base, '');
        this.router.navigateByUrl(updated);
    }

    private updateSearchResults = results => {
        this.searchResults$.next([
            ...this.searchResults$.value,
            ...this.parseResults(results)
        ]);
        this.loadingNext = false;
    };

    fetchNext = (event: IntersectionStatus = IntersectionStatus.Visible) => {
        if (event !== IntersectionStatus.Visible) {
            return;
        }
        this.loadingNext = true;
        this.currentSearchResultPage += 1;
        this.fetchSearchHandler(
            { ...this.searchQuery$.value, page: this.currentSearchResultPage }
        ).pipe(
            untilDestroyed(this)
        ).subscribe(this.updateSearchResults);
    };

    fetchSearchHandler({ query, page }) {
        return from(
            // Using a promise so that request completes and can be cached
            this.cloudApi.documentationInstantSearch(this.kbService.menuNameSubject.value, query.trim(), { page }).toPromise()
        ).pipe(
            catchError(err => {
                console.error(
                    err.message === 'Instant search feature not enabled'
                        ? err
                        : new Error(
                            'Error using instance search fallback to legacy search'
                        )
                );
                return this.cloudApi.getDocumentation(
                    this.kbService.menuNameSubject.value,
                    DOC_TYPES.knowledgebase,
                    { query, page }
                );
            }),
            map(results => ({ ...results, query }))
        );
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute,
        private router: Router,
        private renderer2: Renderer2,
        public ribbonService: NxRibbonService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private pageService: NxPageService,
        @Inject(WINDOW) private window: Window,
        private appStateService: NxAppStateService,
        public kbService: NxKnowledgebaseService
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }

    prefetchDocument({ assetId, state = null, version = 0 }): void {
        if (this.kbService.contentAssetId) {
            return;
        }
        this.cloudApi.getDocumentation(
            this.kbService.menuName,
            DOC_TYPES.knowledgebase,
            assetId,
            state,
            version
        ).pipe(
            untilDestroyed(this)
        ).subscribe(() => this.kbService.prefetchedDocuments.push({ assetId, version, state }));
    }

    parseResults({ docs, totalResults, query }) {
        this.previousQuery = query;
        const processLegacySearch = ({
            snippets,
            title,
            titleMatchStart,
            titleMatchEnd,
            doc_id: docId,
            shortDescription
        }) => {
            const {
                content = '',
                matchStart = 0,
                matchEnd = 0
            } = snippets?.length ? snippets[0] : {};
            return {
                docId,
                snippet: content
                    ? highlight(content, matchStart, matchEnd)
                    : shortDescription,
                title: highlight(
                    title,
                    titleMatchStart,
                    titleMatchEnd
                )
            };
        };

        this.totalResults = totalResults || 0;

        const addEllipses = snippet => {
            snippet = snippet.trim();
            const first = snippet[0];
            const addToStart = first.toUpperCase() !== first ? '...' : '';
            const addToEnd = !snippet.match(/[.,:!?]$/) ? '...' : '';
            return `${addToStart}${snippet}${addToEnd}`;
        };

        const processInstantSearch =
            ({ id: docId, title, body: snippet }) => ({ docId, title, snippet: addEllipses(snippet) });
        return (docs || []).map(doc =>
            (doc.snippets ? processLegacySearch : processInstantSearch)(doc)
        );
    }

    showRibbon(id, state, reviewId?): void {
        const draftActions: RibbonActionInput[] = [
            {
                type: 'link',
                text: this.LANG.ribbon.integration.backToEditText,
                value: this.CONFIG.integration.adminLink.replace('%ID%', id) +
                    this.router.url.split('?')[0] +
                    encodeURIComponent('?state=draft'),
                external: true
            }
        ];
        const message = state
            ? this.LANG.ribbon.integration.previewRibbon()
            : this.LANG.ribbon.integration.publishedRibbon();
        const ribbonActions = reviewId
            ? this.addReviewActions(reviewId, draftActions)
            : draftActions;
        this.ribbonService.show(
            message,
            ribbonActions
        );
    }

    private acceptedReviewRedirect = () => {
        const url = this.uriService.getURL();
        this.router.navigateByUrl(
            '/', { skipLocationChange: true }
        ).then(_ => {
            this.router.navigateByUrl(url);
        });
        this.ribbonService.hide();
    };

    private addReviewActions(reviewId: any, draftActions: RibbonActionInput[]) {
        const process = this.processService.createProcess(() => {
            return this.cloudApi.acceptReview(reviewId);
        }, {
            successMessage: this.LANG.toastMessage.reviewAccepted?.()
        },
        this.acceptedReviewRedirect
        );

        return [
            ...this.getReviewActions(process, reviewId),
            ...draftActions
        ];
    }

    private getReviewActions(process: Process, reviewId: any): RibbonActionInput[] {
        return [
            {
                type: 'process-button',
                text: this.LANG.ribbon.integration.accept?.(),
                value: process
            },
            {
                type: 'link',
                text: this.LANG.ribbon.integration.reject?.(),
                value: `/admin/cms/assetcustomizationreview/${reviewId}/change/`,
                external: true
            }
        ];
    }

    findKBWithArticle(assetId, assetParam) {
        return this.cloudApi.findArticleKB(assetId).subscribe(({ base, kb_name }) => {
            this.router.navigate(['/'], { skipLocationChange: true }).then(_ =>
                this.router.navigate([`/docs/${base}/${kb_name}/${assetParam}`])
            );
        });
    }

    setupRouteSubscription(): void {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(''),
            switchMap(this.initializeMenu),
            switchMap(this.updateDisplayedDoc),
            untilDestroyed(this)
        ).subscribe();
    }

    private updateDisplayedDoc = (firstNode?: any) => {
        const { state, assetId, assetParam } = this.parseAssetDetails(firstNode);

        if (!state && assetId && !this.kbService.assetIds.includes(assetId)) {
            this.findKBWithArticle(assetId, assetParam);
        } else {
            if (!this.kbService.menuName && !this.kbService.activeAssetId) {
                this.pageService.show404();
            }
            return this.cloudApi.getDocumentation(
                this.kbService.menuName,
                DOC_TYPES.knowledgebase,
                this.kbService.activeAssetId,
                state,
                this.kbService.versionLookup[this.kbService.activeAssetId] || 0
            ).pipe(
                tap(this.renderDoc(state))
            );
        }
    };

    private renderDoc = state =>
        ({
            title: originalTitle,
            blocks,
            contentHTML,
            script,
            shortDescription,
            reviewId
        }) => {
            const title = originalTitle
                ? `<h2>${originalTitle}</h2>`
                : originalTitle;
            if (state || this.kbService.account?.is_superuser) {
                this.showRibbon(this.kbService.activeAssetId, state, reviewId);
            }
            this.updatePageNode(
                originalTitle,
                shortDescription,
                title,
                contentHTML,
                blocks,
                script
            );
            setTimeout(() => {
                // Fixes some random edge case where doc gets stuck loading
                this.loading = false;
            });
            setTimeout(this.addCustomScripts);
        };

    private addCustomScripts = () => {
        Array.from(this.scriptDiv?.nativeElement?.children || []).forEach(child => {
            this.renderer2.removeChild(this.scriptDiv.nativeElement, child);
        });
        const myScript = this.renderer2.createElement('script');
        myScript.type = 'text/javascript';
        myScript.innerHTML = this.pageNode.script;
        if (this.scriptDiv?.nativeElement) {
            this.renderer2.appendChild(this.scriptDiv?.nativeElement, myScript);
        }
    };

    private initializeMenu = () => {
        const [snapshot, isContentType] = this.updateSelectedKBandGetSnapshot();
        this.appStateService.altBackground = !isContentType;
        this.updateSelectedMenu(snapshot, isContentType);

        if (!this.route.snapshot.queryParams.search && !this.previousQuery) {
            this.ribbonService.hide();
        }

        if (!this.CONFIG.featureFlags.kbInstantSearch) {
            this.clearSearch();
        }

        return this.getFirstDoc();
    };

    private updatePageNode(
        originalTitle: any,
        shortDescription: any,
        title: any,
        contentHTML: any,
        blocks: any,
        script: any
    ) {
        this.search = { ...this.search };
        this.pageService.pageTitle = originalTitle;
        this.pageService.pageDescription = shortDescription;
        this.pageNode = KnowledgeNode.normalHeader(
            title,
            this.kbService.activeAssetId,
            contentHTML,
            CardClasses.NORMAL,
            (blocks || []).map(({ contentHTML, title, type }) =>
                KnowledgeNode.normalHeader(title, '', contentHTML, type)
            ),
            script
        );
    }

    private parseAssetDetails(firstNode: any) {
        const assetParam = this.route.snapshot.paramMap.get('level1');
        const assetId = assetParam && parseInt(assetParam.split('-')[0]);

        const newAssetId = assetId ||
            this.headerService.currentLocation.assetId ||
            firstNode?.asset_id ||
            this.kbService.contentAssetId;
        this.searchQuery$.next({ query: this.route.snapshot.queryParams.search });
        let state = this.route.snapshot.queryParamMap.get('state');
        if (
            !this.kbService.contentAssetId &&
            !state &&
            newAssetId === firstNode.asset_id &&
            !assetId
        ) {
            state = firstNode.state;
        }
        if (
            newAssetId &&
            !this.route.snapshot.paramMap.get('level1') &&
            !this.kbService.contentAssetId
        ) {
            this.router.navigate(
                ['docs', this.kbService.basePath, this.kbService.kbName, newAssetId],
                { replaceUrl: true, queryParams: { state: state } }
            );
        }

        this.kbService.activeAssetState = state;
        this.kbService.activeAssetId = newAssetId;
        return { state, assetId, assetParam };
    }

    private updateSelectedKBandGetSnapshot() {
        let snapshot = this.route.snapshot;
        while (!snapshot.paramMap.get('kb-name')) {
            snapshot = snapshot.parent;
        }
        this.kbService.kbName =
            snapshot.paramMap.get('kb-name') || this.kbService.kbName;
        while (!snapshot.paramMap.get('name')) {
            snapshot = snapshot.parent;
        }
        this.kbService.basePath = snapshot.paramMap.get('name');
        const isContentType = this.kbService.basePath === 'content';
        return <[ActivatedRouteSnapshot, boolean]>[snapshot, isContentType];
    }

    private updateSelectedMenu(
        snapshot: ActivatedRouteSnapshot,
        isContentType: boolean
    ) {
        const menuName = this.CONFIG
            .docMenuMap[this.kbService.basePath]
            ?.[this.kbService.kbName];
        if (this.kbService.menuName !== menuName || !this.kbService.menuName) {
            this.loading = true;
            this.kbService.menuName = menuName;
        }
        if (!this.kbService.menuName) {
            const assetParam = !isContentType
                ? snapshot.paramMap.get('level1')
                : snapshot.paramMap.get('kb-name');
            if (assetParam) {
                const assetId = parseInt(assetParam.split('-')[0]);
                if (Number.isInteger(assetId)) {
                    if (snapshot.paramMap.get('level1')) {
                        this.findKBWithArticle(assetId, assetParam);
                    } else {
                        this.kbService.contentAssetId = assetId;
                    }
                }
            } else {
                // Navigate to 404 and replace failing url so going history back will load requesting page
                this.pageService.show404();
            }
        } else {
            this.kbService.contentAssetId = null;
        }
    }

    private updateAssetIdsForMenu = menu => {
        if (!this.kbService.assetIds.length) {
            const getAllIds = (nodes: MenuNode[]) => {
                nodes.forEach(node => {
                    if (node.asset_id) {
                        this.kbService.assetIds.push(node.asset_id);
                        this.kbService.versionLookup[node.asset_id] = node.version || 0;
                    }
                    getAllIds(node.nodes);
                });
            };
            this.kbService.assetIds = [];
            getAllIds(menu.nodes);
        }
    };

    private getFirstDoc = () => {
        const traverseToFirst = (
            [first, ...remaining]: MenuNode[] = []
        ): MenuNode =>
            !first
                ? undefined
                : (
                    (first.asset_id && first) ||
                    traverseToFirst([...remaining, ...first.nodes])
                );

        if (this.kbService.contentAssetId) {
            return of(undefined);
        }

        return this.kbService.getMenuObservable().pipe(
            filter(menu => menu?.nodes.length > 0),
            tap(this.updateAssetIdsForMenu),
            map(menu => traverseToFirst(menu.nodes))
        );
    };

    ngOnInit(): void {
        this.relatedLinksFiltered$ = combineLatest([
            this.kbService.activeAssetIdSubject,
            this.relatedLinks$
        ]).pipe(
            map(latest => this.filterRelatedLinks(latest))
        );

        this.setupRouteSubscription();

        this.searchQuery$.pipe(
            switchMap(({ query = '' }) => {
                const previous = this.previousQuery || '';
                const startsWithPrevious = query.startsWith(previous);
                const startsWithCurrent = previous.startsWith(query);
                this.searchMode = !!query;
                this.searchLoading = this.searchMode;

                if (!query) {
                    return Promise.resolve([]);
                }

                if (!startsWithPrevious && !startsWithCurrent) {
                    this.searchResults$.next([]);
                }

                if (previous !== query) {
                    const queryRegex = new RegExp(`(${query.split(' ').filter(word => word).map(word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, match => `\\${match}`)).join('|')})`, 'gi');
                    const start = '<strong class="highlighted">';
                    const end = '</strong>';

                    const updateHighlight = val => val.replaceAll(start, '').replaceAll(end, '').replaceAll(queryRegex, match => `${start}${match}${end}`);

                    const results = this.searchResults$.value.map(doc => Object.entries(doc).reduce((acc, [key, val]) => ({ ...acc, [key]: updateHighlight(val) }), {}));
                    this.searchResults$.next(results);
                }

                this.currentSearchResultPage = 1;
                return this.fetchSearchHandler({
                    query,
                    page: this.currentSearchResultPage
                });
            }),
            untilDestroyed(this)
        ).subscribe((results: any) => {
            this.totalSearchResultPages = results.totalPages;
            this.searchLoading = false;
            this.searchResults$.next(this.parseResults(results));
        });
    }

    ngOnDestroy(): void {
        setTimeout(() => {
            this.appStateService.altBackground = false;
        });
        this.ribbonService.hide();
    }
}
