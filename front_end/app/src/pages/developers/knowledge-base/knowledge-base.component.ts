import {
    Component, OnInit, Renderer2, ViewChild, ElementRef, Inject
}                                                               from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router }                from '@angular/router';
import { WINDOW }                                               from '@services/window-provider';
import { UntilDestroy, untilDestroyed }                         from '@ngneat/until-destroy';
import { BehaviorSubject, combineLatest, EMPTY, of }            from 'rxjs';
import { switchMap, tap, delay, map, filter, startWith }        from 'rxjs/operators';

import { NxConfigService, IConfig }     from '@services/nx-config';
import { NxCloudApiService, DOC_TYPES } from '@services/nx-cloud-api';
import { NxHeaderService }              from '@services/nx-header.service';
import { NxMenusService, MenuNode }     from '@services/menus.service';

import { RelatedLinks }                 from '@components/left-menu/left-menu.component';
import { SearchFilter }                 from '@components/search/search.component';
import { NxPageService } from '../../../services/page.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';
import { NxAccountService, Account }    from '../../../services/account.service';

export enum CardClasses {
    NORMAL='text',
    CONTENT='content',
    SIDE='side',
    ARTICLE='article'
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector      : 'nx-knowledge-base',
    templateUrl   : 'knowledge-base.component.html',
    styleUrls     : ['knowledge-base.component.scss']
})
export class NxKnowledgeBaseComponent implements OnInit {
    @ViewChild('scriptDiv', { read: ElementRef }) private scriptDiv: ElementRef;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    currentSearchResultPage = 0;
    totalSearchResultPages = 0;
    loadingNext = false;
    loading = true;
    searchMode = false;
    searchLoading = false;
    basePath = '';
    menuName = '';
    previewAssetId: number;
    kbName = '';
    assetIds = [];
    pageNode: KnowledgeNode;
    account: Account
    search: SearchFilter = { query: '' };
    searchResults$ = new BehaviorSubject([]);
    searchQuery$ = new BehaviorSubject({ query: '' });
    assetId$ = new BehaviorSubject('');
    relatedLinks$ = new BehaviorSubject<RelatedLinks>({ type: '', nodes: [] });
    relatedLinksFiltered$ = combineLatest([this.assetId$, this.relatedLinks$]).pipe(
        map(this.filterRelatedLinks)
    );

    CardClasses = CardClasses;

    filterRelatedLinks([assetId, relatedLinks]: [string, RelatedLinks]) {
        if (relatedLinks.type === 'next') {
            const currentIndex = relatedLinks.nodes.findIndex(({ asset_id: id }) => `${id}` === assetId);
            if (currentIndex === (relatedLinks.nodes.length - 1)) {
                return [];
            } else {
                return [relatedLinks.nodes[currentIndex + 1]];
            }
        } else if (relatedLinks.type === 'related') {
            return relatedLinks.nodes;
        } else {
            return [];
        }
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

    navigateSearch(doc) {
        this.router.navigate([doc.docId], { relativeTo: this.route.parent });
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
        return !this.previewAssetId ? of({}) : this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.knowledgebase, { query, page }).pipe(delay(this.CONFIG.search.debounceTime));
    }

    constructor(
        configService: NxConfigService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute,
        private router: Router,
        private menusService: NxMenusService,
        private renderer2: Renderer2,
        private pageService: NxPageService,
        private languageService: NxLanguageProviderService,
        private accountService: NxAccountService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }

    prefetchDocument({ assetId, state = null }) {
        if (this.previewAssetId) {
            return;
        }
        this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.knowledgebase, assetId, state).pipe(untilDestroyed(this)).subscribe();
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
                this.kbName = snapshot.paramMap.get('kb-name') || this.kbName;
                while (!snapshot.paramMap.get('name')) {
                    snapshot = snapshot.parent;
                }
                this.basePath = snapshot.paramMap.get('name');
                this.menuName = this.CONFIG.docMenuMap[this.basePath]?.[this.kbName];
                if (!this.menuName) {
                    const assetParam = snapshot.paramMap.get('level1') || snapshot.paramMap.get('kb-name');
                    if (assetParam) {
                        const assetId = parseInt(assetParam.split('-')[0]);
                        if (Number.isInteger(assetId)) {
                            if (snapshot.paramMap.get('level1')) {
                                this.findKBWithArticle(assetId, assetParam);
                            } else {
                                this.previewAssetId = assetId;
                            }
                        }
                    } else {
                        // Navigate to 404 and replace failing url so going history back will load requesting page
                        this.router
                            .navigate([this.CONFIG.redirect.page404], {
                                replaceUrl: true
                            })
                            .catch(_ => {});

                        return;
                    }
                }
                return this.route.url;
            }),
            switchMap(urlSegment => {
                this.loading = true;
                this.clearSearch();
                const getFirstDoc = () => {
                    const traverseToFirst = ([first, ...remaining]: MenuNode[] = []): string => !first ? '' : first.asset_id || traverseToFirst([...remaining, ...first.nodes]);
                    return this.menusService.getMenu(this.menuName || '').pipe(
                        tap(menu => {
                            if (!this.assetIds.length) {
                                const getAllIds = (nodes: MenuNode[]) => {
                                    nodes.forEach(node => {
                                        if (node.asset_id) {
                                            this.assetIds.push(node.asset_id);
                                        }
                                        getAllIds(node.nodes);
                                    });
                                };
                                this.assetIds = [];
                                getAllIds(menu.nodes);
                            }
                        }),
                        map(menu => traverseToFirst(menu.nodes))
                    );
                };
                return getFirstDoc().pipe(
                    switchMap(firstAsset => {
                        const assetParam = this.route.snapshot.paramMap.get('level1');
                        let assetId;
                        if (assetParam) {
                            assetId = parseInt(assetParam.split('-')[0]);
                        }
                        this.assetId$.next(assetId || this.headerService.currentLocation.assetId || firstAsset || this.previewAssetId);
                        this.searchQuery$.next({ query: this.route.snapshot.queryParams.search });
                        const state = this.route.snapshot.queryParamMap.get('state');
                        if (!state && assetId && !this.assetIds.includes(assetId)) {
                            this.findKBWithArticle(assetId, assetParam);
                            return EMPTY;
                        } else {
                            return this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.knowledgebase, this.assetId$.value, state)
                                .pipe(
                                    tap(({ title, blocks, contentHTML, script, shortDescription }) => {
                                        this.search = { ...this.search };
                                        this.pageService.pageTitle = NxLanguageProviderService.translate(
                                            this.LANG.pageTitles.articleTitle, {
                                                ARTICLE_TITLE: title, VMS_NAME: this.CONFIG.vmsName
                                            });
                                        this.pageService.pageDescription = shortDescription;
                                        this.pageNode = KnowledgeNode.normalHeader(
                                            title,
                                            this.assetId$.value,
                                            contentHTML,
                                            CardClasses.NORMAL,
                                            (blocks || []).map(({contentHTML, title, type}) => {
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
        this.accountService.get().then(account => {
            this.account = account;

            this.setupRouteSubscription();

            this.searchQuery$.pipe(
                switchMap(({query}) => {
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
        });
    };
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
