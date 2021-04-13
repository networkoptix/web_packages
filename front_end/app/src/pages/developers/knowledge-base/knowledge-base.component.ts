import {
    Component, OnInit, Renderer2, ViewChild, ElementRef, Inject, OnDestroy
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router }                from '@angular/router';
import { WINDOW }                                               from '@services/window-provider';
import { UntilDestroy, untilDestroyed }                         from '@ngneat/until-destroy';
import { BehaviorSubject, combineLatest, EMPTY, Observable, of } from 'rxjs';
import { switchMap, tap, delay, map, filter, startWith, take } from 'rxjs/operators';

import { NxConfigService, IConfig }     from '@services/nx-config';
import { NxCloudApiService, DOC_TYPES } from '@services/nx-cloud-api';
import { NxHeaderService }              from '@services/nx-header.service';
import { NxMenusService, MenuNode }     from '@services/menus.service';

import { MenuNodeWithParent, RelatedLinks } from '@components/left-menu/left-menu.component';
import { SearchFilter }                 from '@components/search/search.component';
import { NxRibbonService, RibbonActionInput } from '@components/ribbon';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxProcessService } from '../../../services/process.service';
import { NxUriService } from '../../../services/uri.service';
import { NxPageService } from '../../../services/page.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { query } from '@angular/animations';
import { NxKnowledgebaseService } from './knowledge-base.service';

export enum CardClasses {
    NORMAL='text',
    CONTENT='content',
    SIDE='side',
    ARTICLE='article'
}

@UntilDestroy({ checkProperties: false })
@Component({
    selector      : 'nx-knowledge-base',
    templateUrl   : 'knowledge-base.component.html',
    styleUrls     : ['knowledge-base.component.scss']
})
export class NxKnowledgeBaseComponent implements OnInit, OnDestroy {
    @ViewChild('scriptDiv', { read: ElementRef }) private scriptDiv: ElementRef;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    currentSearchResultPage = 0;
    totalSearchResultPages = 0;
    loadingNext = false;
    loading = true;
    searchMode = false;
    searchLoading = false;
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
                const currentIndex = relatedLinks.nodes.findIndex(({ asset_id : id }) => id === assetId);
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

    updateSearchQuery({ query }) {
        if (this.searchQuery$.value.query === query) {
            return;
        }

        this.search = { query, ...this.search };
        this.searchQuery$.next({ query: query || '' });
    }

    clearSearch = () => {
        this.searchLoading = false;
        this.searchResults$.next([]);
        this.searchMode = false;
    };

    navigateSearch() {
        this.searchMode = false;
    }

    projectedLinkHandler({url, target}: { url: string, target: string }) {
        const base = this.window.location.origin;
        if (target || !url.startsWith(base)) {
            return this.window.open(url, target || '_self');
        }
        const updated = url.replace(base, '');
        this.router.navigateByUrl(updated);
    }

    fetchNext = () => {
        this.loadingNext = true;
        this.currentSearchResultPage += 1;
        this.fetchSearchHandler(
            { ...this.searchQuery$.value, page: this.currentSearchResultPage }
        ).pipe(untilDestroyed(this)).subscribe((results) => {
            this.searchResults$.next([...this.searchResults$.value, ...this.parseResults(results)]);
            this.loadingNext = false;
        });
    };

    fetchSearchHandler({ query, page }) {
        return this.kbService.previewAssetId ? of({}) : this.cloudApi.getDocumentation(this.kbService.menuName, DOC_TYPES.knowledgebase, { query, page }).pipe(delay(this.CONFIG.search.debounceTime));
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute,
        private router: Router,
        private menusService: NxMenusService,
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

    prefetchDocument({ assetId, state = null }) {
        if (this.kbService.previewAssetId) {
            return;
        }
        this.cloudApi.getDocumentation(this.kbService.menuName, DOC_TYPES.knowledgebase, assetId, state).pipe(untilDestroyed(this)).subscribe();
    }

    parseResults({ docs }) {
        const highlight = (
            text: string, start, end
        ) => [0, start || 0, end || 0].map((
            splitAt, curInd, fullText
        ) => text.slice(
            splitAt, fullText[curInd + 1]
        )).reduce((
            result, section, curInd
        ) => `${result}${curInd === 1 ? `<strong class="highlighted">${section}</strong>` : section}`, '');

        return (docs || []).map(({ snippets, title, titleMatchStart, titleMatchEnd, doc_id: docId, shortDescription }) => {
            const { content = '', matchStart = 0, matchEnd = 0 } = snippets?.length ? snippets[0] : {};
            return {
                docId,
                snippet: content ? highlight(content, matchStart, matchEnd) : shortDescription,
                title: highlight(title, titleMatchStart, titleMatchEnd)
            };
        });
    }

    showRibbon(id, state, reviewId?) {
        const ribbonActions: RibbonActionInput[] = [
            {
                type  : 'link',
                text  : this.LANG.ribbon.integration.backToEditText,
                value : this.CONFIG.integration.adminLink.replace('%ID%', id) + this.router.url.split('?')[0] + encodeURIComponent('?state=draft'),
                external : true
            }
        ];
        if (reviewId) {
            const process = this.processService.createProcess(() => {
                return this.cloudApi.acceptReview(reviewId);
            }, {
                successMessage : this.LANG.toastMessage.reviewAccepted?.()
            }).then(() => {
                const url = this.uriService.getURL();
                this.router.navigateByUrl('/', { skipLocationChange: true }).then(_ => {
                    this.router.navigateByUrl(url);
                });
                this.ribbonService.hide();
            });
            ribbonActions.unshift(
                {
                    type  : 'process-button',
                    text  : this.LANG.ribbon.integration.accept?.(),
                    value : process
                },
                {
                    type  : 'link',
                    text  : this.LANG.ribbon.integration.reject?.(),
                    value : `/admin/cms/assetcustomizationreview/${reviewId}/change/`,
                    external : true
                }
            );
        }
        this.ribbonService.show(
            state ? this.LANG.ribbon.integration.previewRibbon() : this.LANG.ribbon.integration.publishedRibbon(),
            ribbonActions
        );
    }

    findKBWithArticle(assetId, assetParam) {
        return this.cloudApi.findArticleKB(assetId).subscribe(({ base, kb_name }) => {
            this.router.navigate(['/'], { skipLocationChange: true }).then(_ =>
                this.router.navigate([`/docs/${base}/${kb_name}/${assetParam}`])
            );
        });
    }

    setupRouteSubscription() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(''),
            switchMap(_ => {
                let snapshot = this.route.snapshot;
                while (!snapshot.paramMap.get('kb-name')) {
                    snapshot = snapshot.parent;
                }
                this.kbService.kbName = snapshot.paramMap.get('kb-name') || this.kbService.kbName;
                while (!snapshot.paramMap.get('name')) {
                    snapshot = snapshot.parent;
                }
                this.kbService.basePath = snapshot.paramMap.get('name');
                this.appStateService.altBackground = this.kbService.basePath !== 'content';
                const menuName = this.CONFIG.docMenuMap[this.kbService.basePath]?.[this.kbService.kbName];
                if (this.kbService.menuName !== menuName) {
                    this.kbService.menuName = menuName;
                }
                if (!this.kbService.menuName) {
                    const assetParam = snapshot.paramMap.get('level1') || snapshot.paramMap.get('kb-name');
                    if (assetParam) {
                        const assetId = parseInt(assetParam.split('-')[0]);
                        if (Number.isInteger(assetId)) {
                            if (snapshot.paramMap.get('level1')) {
                                this.findKBWithArticle(assetId, assetParam);
                            } else {
                                this.kbService.previewAssetId = assetId;
                            }
                        }
                    } else {
                        // Navigate to 404 and replace failing url so going history back will load requesting page
                        this.pageService.show404();
                        return;
                    }
                }
                return this.route.url;
            }),
            switchMap(urlSegment => {
                this.loading = true;
                this.ribbonService.hide();
                this.clearSearch();
                const getFirstDoc = () => {
                    const traverseToFirst = ([first, ...remaining]: MenuNode[] = []): MenuNode => !first ? undefined : ((first.asset_id && first) || traverseToFirst([...remaining, ...first.nodes]));
                    return this.kbService.getMenuObservable().pipe(
                        filter(menu => menu?.nodes.length > 0),
                        tap(menu => {
                            if (!this.kbService.assetIds.length) {
                                const getAllIds = (nodes: MenuNode[]) => {
                                    nodes.forEach(node => {
                                        if (node.asset_id) {
                                            this.kbService.assetIds.push(node.asset_id);
                                        }
                                        getAllIds(node.nodes);
                                    });
                                };
                                this.kbService.assetIds = [];
                                getAllIds(menu.nodes);
                            }
                        }),
                        map(menu => traverseToFirst(menu.nodes))
                    );
                };
                return getFirstDoc().pipe(
                    switchMap(firstNode => {
                        const assetParam = this.route.snapshot.paramMap.get('level1');
                        let assetId;
                        if (assetParam) {
                            assetId = parseInt(assetParam.split('-')[0]);
                        }

                        const newAssetId = assetId || this.headerService.currentLocation.assetId || firstNode.asset_id || this.kbService.previewAssetId;
                        this.searchQuery$.next({ query: this.route.snapshot.queryParams.search });
                        let state = this.route.snapshot.queryParamMap.get('state');
                        if (!state && newAssetId === firstNode.asset_id && !assetId) {
                            state = firstNode.state;
                        }
                        this.kbService.activeAssetState = state;
                        this.kbService.activeAssetId = newAssetId;
                        if (!state && assetId && !this.kbService.assetIds.includes(assetId)) {
                            this.findKBWithArticle(assetId, assetParam);
                            return EMPTY;
                        } else {
                            if (!this.kbService.menuName && !this.kbService.activeAssetId) {
                                this.pageService.show404();
                                return EMPTY;
                            }
                            return this.cloudApi.getDocumentation(this.kbService.menuName, DOC_TYPES.knowledgebase, this.kbService.activeAssetId, state)
                                .pipe(
                                    tap(({ title: originalTitle, blocks, contentHTML, script, shortDescription, reviewId }) => {
                                        const title = originalTitle ? `<h2>${originalTitle}</h2>` : originalTitle;
                                        if (state || this.kbService.account?.is_superuser) {
                                            this.showRibbon(this.kbService.activeAssetId, state, reviewId);
                                        }
                                        this.search = { ...this.search };
                                        this.pageService.pageTitle = originalTitle;
                                        this.pageService.pageDescription = shortDescription;
                                        this.pageNode = KnowledgeNode.normalHeader(
                                            title,
                                            this.kbService.activeAssetId,
                                            contentHTML,
                                            CardClasses.NORMAL,
                                            (blocks || []).map(({ contentHTML, title, type }) => {
                                                return KnowledgeNode.normalHeader(
                                                    title,
                                                    '',
                                                    contentHTML,
                                                    type
                                                );
                                            }),
                                            script
                                        );
                                        this.loading = false;
                                        setTimeout(() => {
                                            Array.from(this.scriptDiv?.nativeElement?.children || []).forEach(child => {
                                                this.renderer2.removeChild(this.scriptDiv.nativeElement, child);
                                            });
                                            const myScript = this.renderer2.createElement('script');
                                            myScript.type = 'text/javascript';
                                            myScript.innerHTML = this.pageNode.script;
                                            if (this.scriptDiv?.nativeElement) {
                                                this.renderer2.appendChild(this.scriptDiv?.nativeElement, myScript);
                                            }
                                        });
                                    })
                                );
                        }
                    })
                );
            }),
            untilDestroyed(this)
        ).subscribe();
    }

    ngOnInit() {
        this.relatedLinksFiltered$ = combineLatest([this.kbService.activeAssetIdSubject, this.relatedLinks$]).pipe(
            map(latest => {
                return this.filterRelatedLinks(latest);
            })
        );

        this.setupRouteSubscription();

        this.searchQuery$.pipe(
            switchMap(({ query }) => {
                this.searchMode = !!query;
                this.searchLoading = this.searchMode;
                this.currentSearchResultPage = 1;
                return this.fetchSearchHandler({query, page: this.currentSearchResultPage});
            }),
            untilDestroyed(this)
        ).subscribe((results) => {
            this.totalSearchResultPages = results.totalPages;
            this.searchLoading = false;
            this.searchResults$.next(this.parseResults(results));
        });
    };

    ngOnDestroy() {
        this.appStateService.altBackground = false;
        this.ribbonService.hide();
    }
};

export class KnowledgeNode {
    private constructor(
        public title: string,
        public url: string,
        public content: string,
        public nodes: KnowledgeNode[],
        public script: string,
        public cardClass: CardClasses,
        public cardIcon?: string,
        public cardLead?: string
    ) {}

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

    static sideHeader(
        title: string,
        url: string,
        content,
        nodes: KnowledgeNode[],
        script = '',
        cardIcon: string,
        cardLead: string
    ) {
        return new KnowledgeNode(
            title,
            url,
            content,
            nodes,
            script,
            CardClasses.SIDE,
            cardIcon,
            cardLead
        );
    }

    static article(
        title: string,
        url: string,
        content: string,
        showHeader = true,
        nodes = [],
        script = ''
    ) {
        return new KnowledgeNode(
            showHeader ? title : '',
            url,
            content,
            nodes,
            script,
            CardClasses.ARTICLE,
            '',
            ''
        );
    }
}
