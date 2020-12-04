import { Component, OnInit, ViewEncapsulation, Renderer2, Inject, ViewChild, ElementRef } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { NxCloudApiService, DOC_TYPES } from '../../../services/nx-cloud-api';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap, delay, map, filter } from 'rxjs/operators';
import { NxHeaderService } from '../../../services/nx-header.service';
import { BehaviorSubject, timer, combineLatest } from 'rxjs';
import { MenuNodeWithParent, RelatedLinks } from '../../../components/left-menu/left-menu.component';
import { NxMenusService, MenuNode } from '../../../services/menus.service';
import { SearchFilter, SearchTag } from '../../../components/search/search.component';

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

    get CardClasses() {
        return CardClasses;
    }

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
        ).subscribe((results) => {
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

    prefetchDocument(assetId) {
        console.info(`%cPrefetching document ${assetId}`, 'color:blue;font-size:1.5rem;padding: .75rem 4rem; background-color:gray');
        this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.knowledgebase, assetId).subscribe(document => {
            console.info(
                `%cSuccessfully prefetched document: \n%c${document.title}`,
                'color:green;font-size:1.25rem',
                'color:white;font-size:.75rem;padding:0.5rem 0'
            );
        });
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
        this.route.url.pipe(
            switchMap(urlSegment => {
                this.loading = true;
                this.clearSearch();
                const getFirstDoc = () => {
                    const traverseToFirst = (nodes: MenuNode[]): string => nodes[0].asset_id || traverseToFirst(nodes[0].nodes);
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
                                        Array.from(this.scriptDiv.nativeElement.children).forEach(child => {
                                            this.renderer2.removeChild(this.scriptDiv.nativeElement, child);
                                        });
                                        const myScript = this.renderer2.createElement('script');
                                        myScript.type = 'text/javascript';
                                        myScript.innerHTML = this.pageNode.script;
                                        this.renderer2.appendChild(this.scriptDiv.nativeElement, myScript);
                                    });
                                })
                            );
                    })
                );
            })
        ).subscribe();

        this.searchQuery$.pipe(
            switchMap(({ query }) => {
                this.searchMode = !!query;
                this.searchLoading = this.searchMode;
                this.currentSearchResultPage = 1;
                return this.fetchSearchHandler({ query, page: this.currentSearchResultPage });
            })).subscribe((results) => {
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
