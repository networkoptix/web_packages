import { Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { NxCloudApiService } from '../../../services/nx-cloud-api';
import { ActivatedRoute } from '@angular/router';
import { switchMap, tap, delay } from 'rxjs/operators';
import { NxHeaderService } from '../../../services/nx-header.service';
import { BehaviorSubject } from 'rxjs';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-knowledge-base',
    templateUrl : 'knowledge-base.component.html',
    styleUrls   : ['knowledge-base.component.scss']
})
export class NxKnowledgeBaseComponent implements OnInit {
    CONFIG: IConfig;

    loading = true;
    searchMode = false;
    searchLoading = false;
    node: KnowledgeNode;
    search = { query: '' };
    searchResults$ = new BehaviorSubject([]);
    searchQuery$ = new BehaviorSubject('');

    updateSearchQuery({ query }) {
        this.searchQuery$.next(query);
    }

    clearSearch = () => {
        this.searchLoading = false;
        this.searchResults$.next([]);
        this.searchMode = false;
    }

    constructor(
        configService: NxConfigService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute
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

    ngOnInit() {
        this.route.url.pipe(
            switchMap(urlSegment => {
                this.loading = true;
                this.clearSearch();
                const assetId = urlSegment[0]?.path || this.headerService.currentLocation.assetId;
                this.searchQuery$.next(this.route.snapshot.queryParams.search);
                return this.cloudApi.getDocumentation(assetId)
                    .pipe(
                        tap(({ title, blocks, contentHTML }) => {
                            this.node = KnowledgeNode.normalHeader(
                                title,
                                assetId,
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
            switchMap((query) => {
                this.searchMode = !!query;
                this.searchLoading = this.searchMode;
                return this.cloudApi.getDocumentation({ query }).pipe(delay(this.CONFIG.search.debounceTime));
            })).subscribe((results) => {
            this.searchLoading = false;
            this.searchResults$.next(results);
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
        public cardLead?: string
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
