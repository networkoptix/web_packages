import { Component, OnInit, Renderer2, ViewChild, ElementRef }  from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router }                from '@angular/router';
import { UntilDestroy, untilDestroyed }                         from '@ngneat/until-destroy';
import { BehaviorSubject, combineLatest }                       from 'rxjs';
import { switchMap, tap, delay, map, filter, startWith }        from 'rxjs/operators';

import { NxConfigService, IConfig }     from '@services/nx-config';
import { NxCloudApiService, DOC_TYPES } from '@services/nx-cloud-api';
import { NxHeaderService }              from '@services/nx-header.service';
import { NxMenusService, MenuNode }     from '@services/menus.service';

import { RelatedLinks }                 from '@components/left-menu/left-menu.component';
import { SearchFilter }                 from '@components/search/search.component';

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
    currentSearchResultPage = 0;
    totalSearchResultPages = 0;
    loadingNext = false;
    loading = true;
    searchMode = false;
    searchLoading = false;
    basePath = '';
    menuName = '';
    kbName = '';
    pageNode: KnowledgeNode;
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
        return this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.knowledgebase, { query, page }).pipe(delay(this.CONFIG.search.debounceTime));
    }

    constructor(
        configService: NxConfigService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute,
        private router: Router,
        private menusService: NxMenusService,
        private renderer2: Renderer2
    ) {
        this.CONFIG = configService.config;
    }

    prefetchDocument({ assetId, state = null }) {
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
            const {content = '', matchStart = 0, matchEnd = 0} = snippets?.length ? snippets[0] : {};
            return {
                docId,
                snippet: content ? highlight(content, matchStart, matchEnd) : shortDescription,
                title: highlight(title, titleMatchStart, titleMatchEnd)
            };
        });
    }

    ngOnInit() {
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
                this.menuName = this.CONFIG.docMenuMap[this.basePath][this.kbName];
                if (!this.menuName) {
                    setTimeout(() => this.router.navigate([this.CONFIG.redirect.page404]));
                }
                return this.route.url;
            }),
            switchMap(urlSegment => {
                this.loading = true;
                this.clearSearch();
                const getFirstDoc = () => {
                    const traverseToFirst = ([first, ...remaining]: MenuNode[] = []): string => first.asset_id || traverseToFirst([...remaining, ...first.nodes]);
                    return this.menusService.getMenu(this.menuName).pipe(
                        map(menu => traverseToFirst(menu))
                    );
                };
                return getFirstDoc().pipe(
                    switchMap(firstAsset => {
                        this.assetId$.next(urlSegment[0]?.path || this.headerService.currentLocation.assetId || firstAsset);
                        this.searchQuery$.next({ query: this.route.snapshot.queryParams.search });
                        const state = this.route.snapshot.queryParamMap.get('state');
                        return this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.knowledgebase, this.assetId$.value, state)
                            .pipe(
                                tap(({ title, blocks, contentHTML, script }) => {
                                    this.search = { ...this.search };
                                    this.pageNode = KnowledgeNode.normalHeader(
                                        title,
                                        this.assetId$.value,
                                        contentHTML,
                                        CardClasses.NORMAL,
                                        blocks.map(({ contentHTML, title, type }) => {
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
                    })
                );
            }),
            untilDestroyed(this)
        ).subscribe();

        this.searchQuery$.pipe(
            switchMap(({ query }) => {
                this.searchMode = !!query;
                this.searchLoading = this.searchMode;
                this.currentSearchResultPage = 1;
                return this.fetchSearchHandler({ query, page: this.currentSearchResultPage });
            }),
            untilDestroyed(this)
        ).subscribe((results) => {
            this.totalSearchResultPages = results.totalPages;
            this.searchLoading = false;
            this.searchResults$.next(this.parseResults(results));
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
