import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { NxCloudApiService } from '../../../services/nx-cloud-api';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap, delay, map, filter } from 'rxjs/operators';
import { NxHeaderService } from '../../../services/nx-header.service';
import { BehaviorSubject, timer, combineLatest } from 'rxjs';
import { MenuNodeWithParent } from '../../../components/left-menu/left-menu.component';
import { SearchFilter, SearchTag } from '../../../components/search/search.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector      : 'nx-knowledge-base',
    templateUrl   : 'knowledge-base.component.html',
    styleUrls     : ['knowledge-base.component.scss'],
    encapsulation : ViewEncapsulation.ShadowDom
})
export class NxKnowledgeBaseComponent implements OnInit {
    CONFIG: IConfig;
    currentSearchResultPage = 0;
    totalSearchResultPages = 0;
    loadingNext = false;
    loading = true;
    searchMode = false;
    searchLoading = false;
    pageNode: KnowledgeNode;
    search: SearchFilter = { query: '' };
    searchResults$ = new BehaviorSubject([]);
    searchQuery$ = new BehaviorSubject({ query: '', tags: ' '});
    assetId$ = new BehaviorSubject('');
    relatedLinks$ = new BehaviorSubject<MenuNodeWithParent[]>([])
    relatedLinksFiltered$ = combineLatest([this.assetId$, this.relatedLinks$]).pipe(
        map(this.filterRelatedLinks)
    )

    filterRelatedLinks([assetId, nodes]: [string, MenuNodeWithParent[]]) {
        const currentIndex = nodes.findIndex(({ asset_id: id }) => `${id}` === assetId);
        if (currentIndex === (nodes.length - 1)) {
            return [];
        } else {
            return [nodes[currentIndex + 1]];
        }
    }

    updateSearchQuery({ query, tags }) {
        const filteredTags = (tags || []).reduce(
            (joined, tag) => tag.value ? joined + `${tag.id},` : joined, ''
        )
        if (this.searchQuery$.value.query === query && this.searchQuery$.value.tags === filteredTags) {
            return;
        };

        this.search = {query, ...this.search}
        this.searchQuery$.next({
            query: query || '',
            tags: filteredTags
        });
    }

    clearSearch = () => {
        this.searchLoading = false;
        this.searchResults$.next([]);
        this.searchMode = false;
    }

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
    }

    fetchSearchHandler({ query, page, tags }) {
        return this.cloudApi.getDocumentation({ query, page, tags }).pipe(delay(this.CONFIG.search.debounceTime));
    }

    constructor(
        configService: NxConfigService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.CONFIG = configService.config;
    }

    prefetchDocument(assetId) {
        console.info(`%cPrefetching document ${assetId}`, 'color:blue;font-size:1.5rem;padding: .75rem 4rem; background-color:gray');
        this.cloudApi.getDocumentation(assetId).subscribe(document => {
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
        this.route.url.pipe(
            switchMap(urlSegment => {
                this.loading = true;
                this.clearSearch();
                this.assetId$.next(urlSegment[0]?.path || this.headerService.currentLocation.assetId);
                this.searchQuery$.next({
                    query: this.route.snapshot.queryParams.search,
                    tags: ''
                    // tags: this.route.snapshot.queryParams.tags 
                });
                return this.cloudApi.getDocumentation(this.assetId$.value)
                    .pipe(
                        tap(({ title, blocks, contentHTML, tags }) => {
                            this.search = {
                                ...this.search,
                                tags: []
                                // tags: tags.map(tag => (this.search.tags || []).find(({id}) => id === tag.id) || {...tag, value: true}),
                            };
                            this.pageNode = KnowledgeNode.normalHeader(
                                title,
                                this.assetId$.value,
                                contentHTML,
                                blocks.map(({ contentHTML, title }) => KnowledgeNode.normalHeader(
                                    title,
                                    '',
                                    contentHTML
                                ))
                            );
                            this.loading = false;
                        })
                    );
            })
        ).subscribe();

        this.searchQuery$.pipe(
            switchMap(({query, tags}) => {
                this.searchMode = !!query || !!tags;
                this.searchLoading = this.searchMode;
                this.currentSearchResultPage = 1;
                return this.fetchSearchHandler({ query, tags, page: this.currentSearchResultPage });
            })).subscribe((results) => {
            this.totalSearchResultPages = results.totalPages;
            this.searchLoading = false;
            this.searchResults$.next(this.parseResults(results));
        });
    };
};

export enum CardClasses {
    NORMAL='normal',
    SIDE='side',
    ARTICLE='article'
}

export class KnowledgeNode {
    private constructor(
        public title: string,
        public url: string,
        public content: string,
        public nodes: KnowledgeNode[],
        public cardClass: CardClasses,
        public cardIcon?: string,
        public cardLead?: string,
    ) {}

    // Factory methods
    static normalHeader(
        title: string,
        url: string,
        content: string,
        nodes: KnowledgeNode[] = []
    ) {
        return new KnowledgeNode(
            title,
            url,
            content,
            nodes,
            CardClasses.NORMAL
        );
    }

    static sideHeader(
        title: string,
        url: string,
        content,
        nodes: KnowledgeNode[],
        cardIcon: string,
        cardLead: string
    ) {
        return new KnowledgeNode(
            title,
            url,
            content,
            nodes,
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
        nodes = []
    ) {
        return new KnowledgeNode(
            showHeader ? title : '',
            url,
            content,
            nodes,
            CardClasses.ARTICLE,
            '',
            ''
        );
    }
}
